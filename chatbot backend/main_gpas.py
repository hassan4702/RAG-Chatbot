import datetime
import json
import uuid
import os
import shutil
from fastapi.responses import JSONResponse
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
import jwt
from pydantic import BaseModel
from typing import List, Optional
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Query, Depends, HTTPException
from elasticsearch import Elasticsearch
from llama_index.core import SimpleDirectoryReader, Settings, PromptTemplate, VectorStoreIndex, StorageContext
from llama_index.llms.huggingface import HuggingFaceLLM
from llama_index.core.postprocessor import SentenceTransformerRerank
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.elasticsearch import ElasticsearchStore
from llama_index.core.node_parser import TokenTextSplitter
from transformers import AutoTokenizer
from IPython.display import Markdown, display
import torch
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.storage.chat_store import SimpleChatStore
from llama_index.core.postprocessor import SentenceTransformerRerank, MetadataReplacementPostProcessor
import asyncio
# from datetime import datetime
from llama_index.core.chat_engine import ContextChatEngine
from elasticsearch import Elasticsearch, NotFoundError
from IngestData import read_directory
from apscheduler.schedulers.background import BackgroundScheduler
# from datetime import datetime, timedelta
###########################################################################################################################
# Configuration
scheduler = BackgroundScheduler()
scheduler.start()
scheduled_recreations = {}
memory_buffers = {}
# Secret key and algorithm for JWT
SECRET_KEY = "cowsarenotcool"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
es = Elasticsearch("http://192.168.0.124:9200")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

###########################################################################################################################
#Model

# Initialize embedding model
embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-large-en-v1.5",
    device="cuda"
)
Settings.embed_model = embed_model

# Initialize tokenizer
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-3B-Instruct")

system_prompt = """Your name is GPAS or Geopolitical Analysis System and you are a Q&A assistant specializing in geopolitical topics, trained on a comprehensive dataset of books, theses, and research papers. Your objective is to provide accurate, concise, short and well-reasoned answers based strictly on the provided context.

Strictly follow the below instructions and after analyzing the query give short 2 lines response. If detailed answer is required then return a precice 5 lines answer. Do not return lenghty responses. 
Answer only from the provided context and do not write the code, joke or other irrelevant answer.

Instructions:
1. Analyze each query carefully and respond based only on the provided context or your knowledge. Avoid fabricating information or guessing.
2. If the user greets you, respond with a brief and thoughtful greeting.
3. If the question falls outside the provided context or scope, gently steer the conversation back to a relevant topic or simply respond with: "I don't know. The query is out of context."
4. Provide answers that are short yet complete. Avoid partial or truncated responses.
5. Ensure your responses are conceptually clear and informative, especially when explaining complex topics.
6. Strictly avoid giving code, jokes and irrelevant content in the response.
7. Do not provide irrelevant information outside of the provided context.

Follow these instructions carefully in every response. """

query_wrapper_prompt = PromptTemplate("""<|begin_of_text|><|start_header_id|>system<|end_header_id|>{system_prompt}<|eot_id|>
                                      <|start_header_id|>user<|end_header_id|>{query_str}<|eot_id|>
                                      <|start_header_id|>assistant<|end_header_id|>""")


# Define stopping IDs
stopping_ids = [
    tokenizer.eos_token_id,
    tokenizer.convert_tokens_to_ids("<|eot_id|>"),
]

# Initialize LLM
llm = HuggingFaceLLM(
context_window=128000,
max_new_tokens=750,
generate_kwargs={"temperature": 0.5, "do_sample": True},
system_prompt=system_prompt,
query_wrapper_prompt=query_wrapper_prompt, 
tokenizer_name="meta-llama/Llama-3.2-3B-Instruct",
model_name="meta-llama/Llama-3.2-3B-Instruct",
device_map="cuda",
stopping_ids=stopping_ids,
model_kwargs={"torch_dtype": torch.float16}
)
Settings.llm = llm 
# Initialize Elasticsearch vector store
vector_store = ElasticsearchStore(
    es_url="http://192.168.0.124:9200",  # Elasticsearch URL
    index_name="gpas",
    embeddings=embed_model
)

storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_vector_store(vector_store)

postproc = MetadataReplacementPostProcessor(
    target_metadata_key="window"  # Specifies the target metadata key for replacement
)
# Postprocessor
rerank = SentenceTransformerRerank(model="cross-encoder/ms-marco-MiniLM-L-2-v2", top_n=3, device="cuda")

###########################################################################################################################

# Models for api

class QuestionRequest(BaseModel):
    question: str

class PromptRequest(BaseModel):
    prompt: str

class UsernameRequest(BaseModel):
    username: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    role: str  

class LoginRequest(BaseModel):
    email: str
    password: str

class QueryRequest(BaseModel):
    query: str


class Message(BaseModel):
    role: str
    content: str

    def to_dict(self):
        return {"role": self.role, "content": self.content}
    
class MessagesRequest(BaseModel):
    messages: List[Message]

class Message(BaseModel):
    role: str
    content: str

class Chat(BaseModel):
    user_id: str
    chat_id: str
    messages: List[Message] = []

class UpdateTitleRequest(BaseModel):
    title: str


class TitleSummary(BaseModel):
    id: str
    title: str
    time_stamp: str

class ChatSummary(BaseModel):
    id: str
    title: str
    chat_memory:  Optional[dict] = None 

########################################################################################################################

#Funtions 

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def user_exists(username: str) -> bool:
    result = es.search(index="users", body={
        "query": {
            "match": {
                "username": username
            }
        }
    })
    return result['hits']['total']['value'] > 0

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def register_user(username: str, email: str, role: str, hashed_password: str, timestamp: str):
    user_data = {
        "username": username,
        "email": email,
        "role": role,  # Added role to user data
        "password": hashed_password,
        "timestamp": timestamp
    }
    es.index(index="users", body=user_data)

def get_user(username: str):
    result = es.search(index="users", body={
        "query": {
            "match": {
                "username": username
            }
        }
    })
    if result['hits']['total']['value'] > 0:
        hit = result['hits']['hits'][0]
        user_data = hit['_source']
        user_data['_id'] = hit['_id']  # Include the '_id' in the user data
        return user_data
    return None

def get_user_by_email(email: str):
    result = es.search(index="users", body={
        "query": {
            "match": {
                "email": email
            }
        }
    })
    if result['hits']['total']['value'] > 0:
        hit = result['hits']['hits'][0]
        user_data = hit['_source']
        user_data['_id'] = hit['_id']
        return user_data
    return None

def ensure_index_exists(es_client):
    if not es_client.indices.exists(index="users"):
        es_client.indices.create(index="users", body={
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 1
            },
            "mappings": {
                "properties": {
                    "username": {"type": "text"},
                    "email": {"type": "text"},
                    "role": {"type": "text"},
                    "password": {"type": "text"},
                    "timestamp": {"type": "date"}
                }
            }
        })
        print("Index 'users' created.")
    else:
        print("Index 'users' already exists.")

# Function to create a JWT token
def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# Function to decode JWT token
def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
# Validate JWT 
def verify_jwt(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user")
    except jwt.PyJWTError:
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    
def create_chat(user_id: str):
    chat_id = str(uuid.uuid4())  # Generate a unique chat_id
    chat_data = {
        "user_id": user_id,
        "chat_id": chat_id,
        "messages": []
    }
    es.index(index="user_chats", body=chat_data)
    return chat_id

def get_chat(chat_id: str):
    result = es.search(index="user_chats", body={
        "query": {
            "match": {
                "chat_id": chat_id
            }
        }
    })
    if result['hits']['total']['value'] > 0:
        return result['hits']['hits'][0]['_source']
    return None

def append_message(chat_id: str, role: str, content: str):
    chat = get_chat(chat_id)
    if chat:
        chat['messages'].insert({"role": role, "content": content})
        es.index(index="user_chats", id=chat_id, body=chat)  # Update the chat in Elasticsearch
    else:
        raise HTTPException(status_code=404, detail="Chat not found")


def ensure_chat_index_exists(es_client):
    if not es_client.indices.exists(index="user_chats"):
        es_client.indices.create(index="user_chats", body={
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 1
            },
            "mappings": {
                "properties": {
                    "user_id": {"type": "keyword"},
                    "chat_id": {"type": "keyword"},
                    "messages": {
                        "type": "nested",
                        "properties": {
                            "role": {"type": "keyword"},
                            "content": {"type": "text"}
                        }
                    }
                }
            }
        })
        print("Index 'user_chats' created.")
    else:
        print("Index 'user_chats' already exists.")

def create_new_chat(username:str):
    user = get_user(username)  # Get the registered user data
    chat_id = create_chat(user_id=user["_id"])  # Create a chat for the user
    return {"chat_id": chat_id}

def save_memory_to_elasticsearch(user_id: str, chat_id: str, chat_engine: ContextChatEngine):
    key = (user_id, chat_id)
    
    if key in memory_buffers:
        # Serialize chat memory to JSON
        chat_store = memory_buffers[key].chat_store
        json_obj = chat_store.json()  # Ensure `json_obj` is JSON-serializable
        
        # Define the document ID for easy retrieval
        doc_id = f"{user_id}-{chat_id}"
        
        # Check if the document already exists in Elasticsearch
        try:
            existing_doc = es.get(index="chat_memory", id=doc_id)
            # If document exists, update it
                
            updated_memory = {
                "chat_memory": json_obj,  # New messages
                "timestamp": datetime.datetime.now().isoformat()  # Update timestamp
            }
            es.update(index="chat_memory", id=doc_id, body={"doc": updated_memory})
            print("Document updated in Elasticsearch.")
        except NotFoundError:
            # If document does not exist, create it with title and chat_memory
            title_response = llm.complete(f"give me a title for this chat {memory_buffers[key].chat_store}, it should not be more than 2 words,dont enclose the response in quotes")
            print("Title response", title_response)
            title = title_response.text
            title = title.replace('"', "")
            
            

            # Store in Elasticsearch
            es.index(index="chat_memory", id=doc_id, body={
                "user_id": user_id,
                "chat_id": chat_id,
                "chat_memory": json_obj,
                "title": title,
                "timestamp": datetime.datetime.now().isoformat()
            })
            print("Document created and saved in Elasticsearch.")


def retrieve_memory_from_elasticsearch(user_id: str, chat_id: str):
    key = (user_id, chat_id)
    
    if key not in memory_buffers:  # Only fetch if it doesn't exist in memory
        doc_id = f"{user_id}-{chat_id}"
        
        # Retrieve from Elasticsearch
        result = es.get(index="chat_memory", id=doc_id, ignore=404)
        
        if result.get("found"):
            json_obj = result["_source"]["chat_memory"]
            # Deserialize the chat memory
            loaded_chat_store = SimpleChatStore.parse_raw(json_obj)
            memory_buffers[key] = ChatMemoryBuffer.from_defaults(chat_store=loaded_chat_store, token_limit=128000)
    
    # Return the memory buffer if found, otherwise None
    return memory_buffers.get(key)


def get_or_create_memory(user_id: str, chat_id: str):
    key = (user_id, chat_id)
    
    # Attempt to load from Elasticsearch if not already in memory
    memory = retrieve_memory_from_elasticsearch(user_id, chat_id)
    
    # Create new if still not in memory
    if memory is None:
        chat_store = SimpleChatStore()  # Empty store for a new session
        memory = ChatMemoryBuffer.from_defaults(chat_store=chat_store, token_limit=128000)
        memory_buffers[key] = memory  # Cache it in memory_buffers for this session
    
    return memory

ensure_index_exists(es)
ensure_chat_index_exists(es)

########################################################################################################################

# Endpoints

# Root endpoint to check if the server is running
@app.get("/")
def read_root():
    return {"message": "Server is running"}

# Endpoint to register a new user
@app.post("/register")
def register(request: RegisterRequest):

    if user_exists(request.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(request.password)
    timestamp = datetime.datetime.now().isoformat()  # Automatically add timestamp
    register_user(request.username, request.email, request.role, hashed_password, timestamp)  # Added role to registration
    return {"message": "User registered successfully"}

@app.post("/login")
def login(request: LoginRequest):
    user = get_user_by_email(request.email)  # Changed to find user by email
    if user and verify_password(request.password, user['password']):
        token_data = {
            "email": user['email'],
            "username": user['username'],
            "role": user['role'],
            "timestamp": user['timestamp'],
            "id": user.get('_id', 'unknown')
        }
        access_token = create_access_token(token_data)
        return {"token": access_token}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.delete("/chat/{id}")
async def delete_chat_memory(id: str):
    key = id
    doc_id = id

    # Try to delete the document from Elasticsearch
    try:
        es.delete(index="chat_memory", id=doc_id, ignore=[404])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete from Elasticsearch: {e}")

    # Check if memory is cached in the buffer and delete it
    if key in memory_buffers:
        del memory_buffers[key]
        print("Memory buffer cleared.")
    
    return {"message": "Chat memory deleted successfully"}


@app.post("/text/{user_id}/{chat_id}")
async def ask_question(user_id: str, chat_id: str, request: QuestionRequest):
    memory = get_or_create_memory(user_id, chat_id)  # Get specific memory for user session
    async def chat_streamer():
        try:
            chat_engine = index.as_chat_engine(
                similarity_top_k=10,
                node_postprocessors=[postproc, rerank],
                chat_mode="context",
                memory=memory,  # Pass session-specific memory here
                system_prompt=system_prompt,
                llm=llm,
            )
            res = chat_engine.stream_chat(request.question)
            for token in res.response_gen:  # Assuming response_gen is async iterable
                yield str(token)
                await asyncio.sleep(0.001)
            
            save_memory_to_elasticsearch(user_id, chat_id,chat_engine)
        except Exception as e:
            yield f"Error: {str(e)}"

    return StreamingResponse(chat_streamer(), media_type="text/plain")


@app.get("/chat_summaries/{user_id}", response_model=List[ChatSummary])
async def get_chat_summaries(user_id: str):
    # Elasticsearch query to get title and chat_memory fields for a specific user_id
    query = {
        "query": {
            "match": {
                "user_id.keyword": user_id
            }
        },
        "_source": ["title", "chat_memory"]
    }

    try:
        # Execute search query
        response = es.search(index="chat_memory", body=query)
        chat_summaries = []

        # Extract and process the required fields from each document
        for hit in response["hits"]["hits"]:
            # Convert chat_memory from JSON string to dictionary
            chat_memory_str = hit["_source"]["chat_memory"]
            chat_memory_dict = json.loads(chat_memory_str)
            
            # Append the processed data to the list
            chat_summary = ChatSummary(
                id=hit["_id"],  # Include the Elasticsearch document ID
                title=hit["_source"]["title"],
                chat_memory=chat_memory_dict
            )
            chat_summaries.append(chat_summary)

        return chat_summaries

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/chat_titles/{user_id}", response_model=List[TitleSummary])
async def get_chat_titles(user_id: str):
    # Elasticsearch query to get only the title field for a specific user_id
    query = {
        "query": {
            "match": {
                "user_id.keyword": user_id
            }
        },
        "_source": ["title","timestamp"]
    }

    try:
        # Execute search query
        response = es.search(index="chat_memory", body=query,size=10000)
        title_summaries = []

        # Extract and process the required fields from each document
        for hit in response["hits"]["hits"]:
            title_summary = TitleSummary(
                id=hit["_id"],            # Include the Elasticsearch document ID
                title=hit["_source"]["title"],
                time_stamp=hit["_source"]["timestamp"]
            )
            title_summaries.append(title_summary)

        return title_summaries

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
#call thi sapi with the chat_id to get the chat memory
@app.get("/chat_memory/{chat_id}")
async def get_chat_memory_by_id(chat_id: str):
    query = {
        "query": {
            "match": {
                "_id": chat_id
            }
        }
    }
    try:
        response = es.search(index="chat_memory", body=query)
        if response["hits"]["total"]["value"] == 0:
            raise HTTPException(status_code=404, detail="Chat not found")

        chat_data = response["hits"]["hits"][0]["_source"]

        # Parse chat_memory from JSON string to dictionary
        chat_memory_dict = json.loads(chat_data["chat_memory"])

        return {
            "id": chat_id,
            "chat_memory": chat_memory_dict
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse chat memory data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/upload_pdfs')
async def upload_pdfs(files: list[UploadFile] = File(...)):
    saved_files = []
    
    for file in files:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        file_path = os.path.join("PDFs/Untrained/", file.filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(file.filename)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {file.filename}. Error: {str(e)}")
    
    read_directory()

    return JSONResponse(content={"message": "Files uploaded successfully", "files": saved_files})
    

@app.get('/pdfs')
async def get_pdfs():
    try:
        # Perform the aggregation query to get unique file names
        result = es.search(
            index="gpas_new",
            body={
                "size": 0,  # Set size to 0 because we only want aggregations
                "aggs": {
                    "unique_file_names": {
                        "terms": {
                            "field": "metadata.file_name.keyword",  # Ensure this is a keyword field for exact match
                            "size": 10000  # Adjust this if you expect more than 10,000 unique names
                        }
                    }
                }
            }
        )
        
        # Extract unique file names from the aggregation result
        unique_file_names = [bucket["key"] for bucket in result["aggregations"]["unique_file_names"]["buckets"]]
        
        return {"unique_file_names": unique_file_names}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete('/delete_pdfs')
async def delete_pdfs(request: QueryRequest):
    try:
        # Elasticsearch delete-by-query to delete documents with the specified file name
        response = es.delete_by_query(
            index="gpas_new",
            body={
                "query": {
                    "term": {
                        "metadata.file_name.keyword": request.query  # Ensure keyword field for exact match
                    }
                }
            }
        )
        
        # Check the response for deleted documents count
        deleted_count = response.get("deleted", 0)
        
        return {"message": f"{deleted_count} documents deleted with file name '{request.query}'"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/update-title/{doc_id}")
async def update_title(doc_id: str, request: UpdateTitleRequest):
    index_name = "chat_memory"  # Replace with your actual index name
    
    try:
        # Use Elasticsearch's update API
        response = es.update(
            index=index_name,
            id=doc_id,
            body={
                "doc": {
                    "title": request.title
                }
            }
        )
        return {"message": "Title updated successfully", "result": response}

    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users", response_model=list[dict])
async def get_users():
    index_name = "users"  # Replace with your Elasticsearch index name
    try:
        # Define search query to get username and email fields
        response = es.search(
            index=index_name,
            body={
                "_source": ["id","username", "email"],
                "query": {
                    "match_all": {}
                }
            }
        )

        # Extract hits
        users = [
            {
                "id": hit["_id"],
                "username": hit["_source"]["username"],
                "email": hit["_source"]["email"]
            }
            for hit in response["hits"]["hits"]
        ]

        return users
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Index not found")


@app.delete("/users/{user_id}", response_model=dict)
async def delete_user(user_id: str):
    index_name = "users"  # Replace with your Elasticsearch index name
    try:
        # Check if the user exists
        if not es.exists(index=index_name, id=user_id):
            raise HTTPException(status_code=404, detail="User not found")

        # Delete the user by ID
        es.delete(index=index_name, id=user_id)
        return {"message": f"User with ID {user_id} deleted successfully"}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="User not found")

# to del index after 30 days and recreate it 

# @app.delete("/delete-index/{index_name}")
# async def delete_index(index_name: str):
#     # Check if the index exists
#     if not es.indices.exists(index=index_name):
#         raise HTTPException(status_code=404, detail="Index not found")

#     # Delete the index
#     es.indices.delete(index=index_name)
#     scheduled_recreations[index_name] = datetime.now() + timedelta(days=30)

#     # Schedule a recreation task after 30 days
#     scheduler.add_job(recreate_index, 'date', run_date=scheduled_recreations[index_name], args=[index_name])
    
#     return {"message": f"Index '{index_name}' deleted. It will be recreated after 30 days."}


# def recreate_index(index_name: str):
#     # Recreate the index if it does not already exist
#     if not es.indices.exists(index=index_name):
#         es.indices.create(index=index_name)
#         print(f"Index '{index_name}' has been recreated.")


# @app.on_event("shutdown")
# def shutdown_event():
#     # Shutdown the scheduler on app shutdown
#     scheduler.shutdown()


# using Cli
# pythoon -m uvicorn main:app --host 192.168.0.118 --port 5000

# Run server 
if __name__ == "__main__":
    import uvicorn
    # uvicorn.run(app, host="0.0.0.0", port=5000,reload=True)


