import { Bot, Copy, Rocket, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import ChatInput from "./ChatInput";
import { useSession } from "next-auth/react";
import { setMessages } from "@/app/features/messagesSlice";
import { useDispatch } from "react-redux";
import TypingAnimation from "./ui/typing-animation";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toggleupdateSidebar } from "@/app/features/updateSidebarSlice";
import { useToast } from "@/hooks/use-toast";
const ChatMessage = ({ message, role, id, toast }) => {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setIsCopied(true);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
        status: "success",
        duration: 2000,
      });
      setTimeout(() => setIsCopied(false), 2000); // Reset copy status after 2 seconds
    });
  };
  return (
    <div
      key={id}
      className={`flex  ${
        role == "user" ? "justify-end" : "justify-start"
      } my-2 items-center`}
    >
      {role === "user" ? (
        <>
          <div className="max-w-[800px] w-fit p-3 rounded-2xl bg-[#2f2f2f] text-white break-words">
            <p className="break-words">{message}</p>
          </div>
        </>
      ) : (
        <>
          <Bot className=" h-6 w-6 mr-2" />
          <div
            key={id}
            className="max-w-[800px] w-fit p-3 rounded-lg bg-transparent text-white break-words"
          >
            {message.split("\n\n").map((item, key) => {
              return (
                <div key={key} className="">
                  <Markdown
                    className="break-words w-full max-w-[800px] leading-7"
                    remarkPlugins={[remarkBreaks, remarkGfm]}
                    key={key}
                    components={{
                      li({ children }) {
                        return (
                          <li className="flex flex-row gap-3 text-gray-300">
                            <div className="text-white">● </div>
                            <div>{children}</div>
                          </li>
                        );
                      },
                      strong({ children }) {
                        return (
                          <strong className="text-gray-100">{children}</strong>
                        );
                      },
                      p({ children }) {
                        return <p className="text-white">{children}</p>;
                      },
                    }}
                  >
                    {item}
                  </Markdown>
                </div>
              );
            })}
            <button
              onClick={handleCopy}
              className=" text-gray-300 hover:text-white pt-2"
              aria-label="Copy message"
            >
              <Copy className="h-4 w-4 " />
            </button>
          </div>
        </>
      )}
      {role == "user" && <User className="h-6 w-6 ml-2" />}
    </div>
  );
};
const ChatWindow = ({ messages, id }) => {
  const bottomRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const { toast } = useToast();
  const handleChatmemory = async (e) => {
    const key = `${session?.user?.id}-${id}`;
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_API_URL + `/chat_memory/${key}`
      );
      dispatch(setMessages(response.data.chat_memory.store.chat_history));
    } catch (error) {
      console.error("Error fetching chat data:", error);
    }
  };

  useEffect(() => {
    handleChatmemory();
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function askQuestion() {
    if (!input.trim()) return;
    const newMessage = {
      content: input,
      role: "user",
    };
    const updatedMessages = [...messages, newMessage];

    dispatch(setMessages(updatedMessages));
    setInput("");

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/text/${session?.user?.id}/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: input }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch response from the server.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });

        dispatch(
          setMessages([
            ...updatedMessages,
            {
              content: result,
              role: "assistant",
            },
          ])
        );
      }

      dispatch(toggleupdateSidebar());
      setIsLoading(false);

      return result;
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while sending your question.",
        status: "error",
        variant: "destructive",
        duration: 5000,
      });
    }
  }
  return (
    <>
      <div className="h-screen pb-20 pt-16 w-full overflow-hidden flex flex-col max-w-[700px]  rounded-lg  items-center ">
        {messages.length === 0 && (
          <div className="h-screen w-full flex justify-center items-center">
            <TypingAnimation
              duration={35}
              className="dark:text-white text-black"
              text="How can I help you today?"
            />
          </div>
        )}
        <div className="overflow-y-scroll w-full h-full  no-scrollbar ">
          {messages.map((msg, index) => (
            <ChatMessage
              key={index}
              message={msg.content}
              role={msg.role}
              id={id}
              toast={toast}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput
        isLoading={isLoading}
        askQuestion={askQuestion}
        input={input}
        setInput={setInput}
      />
    </>
  );
};

export default ChatWindow;
