import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowUp01, Loader } from "lucide-react";
import TypingAnimation from "@/components/ui/typing-animation";
import TextareaAutosize from "react-textarea-autosize";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { setMessages } from "@/app/features/messagesSlice";
import { toggleupdateSidebar } from "@/app/features/updateSidebarSlice";
const Landing = () => {
  const placeholders = [
    "What do you want to know about Pakistan's geopolitics?",
    "Ask me about Pakistan's foreign relations or policies.",
    "Curious about Pakistan's role in regional stability? Ask away!",
    "How can I help you understand Pakistan's geopolitical dynamics?",
    "Explore Pakistan's history, diplomacy, or international stance here.",
    "What's on your mind about Pakistan's neighboring relations?",
    "Ask about Pakistan's economic ties or strategic alliances.",
    "Curious about Pakistan's stance on global issues? Let's discuss!",
    "Dive into Pakistan's political history or border dynamics.",
    "How can I assist with insights on Pakistan's global partnerships?",
  ];
  const [displayText, setDisplayText] = useState(""); // Current placeholder being displayed
  const [currentIndex, setCurrentIndex] = useState(0); // Index of the placeholder
  const [wordIndex, setWordIndex] = useState(0); // Word-by-word index
  const [input, setInput] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const words = placeholders[currentIndex].split(" "); // Split current placeholder into words

    const interval = setInterval(() => {
      if (wordIndex < words.length) {
        setDisplayText((prev) => `${prev} ${words[wordIndex]}`.trim()); // Append the next word
        setWordIndex((prevWordIndex) => prevWordIndex + 1);
      } else {
        clearInterval(interval); // Stop interval when all words are displayed
        setTimeout(() => {
          // Move to next placeholder after a pause
          setCurrentIndex((prevIndex) => (prevIndex + 1) % placeholders.length);
          setWordIndex(0); // Reset word index for the next placeholder
          setDisplayText(""); // Clear displayText for smooth transition
        }, 2000); // Pause for 1 second
      }
    }, 300); // Reveal a word every 500ms

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [currentIndex, wordIndex]); // Add wordIndex to dependencies

  async function askQuestion() {
    const id = uuidv4().replace(/-/g, "");
    if (!input.trim()) return;
    const newMessage = {
      content: input,
      role: "user",
    };
    const updatedMessages = [newMessage];
    dispatch(setMessages(updatedMessages));
    setInput("");
    try {
      setIsLoading(true);

      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL + `/text/${session?.user?.id}/${id}`,
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
      router.push(`/chat/${id}`);

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
    <div>
      <div className="h-screen justify-center flex-col flex items-center bg-transparent">
        <div className="h-[40rem] absolute items-center justify-center ">
          <TextHoverEffect text="GPAS" />
        </div>
        <TypingAnimation
          duration={60}
          className="dark:text-white text-black text-3xl mb-4"
          text="How can I help you today?"
        />
        <div className="relative w-[750px] xs:w-[300px] sm:w-[400px] md:w-[500px] xl:w-[750px]  lg:w-[600px] mt-4">
          <TextareaAutosize
            onKeyDownCapture={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevents adding a new line
                askQuestion(); // Call your submit function
              }
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            minRows={1}
            maxRows={10}
            className="pl-10 w-full h-[200px] pr-4 py-4 no-scrollbar rounded-3xl bg-[#2f2f2f] dark:bg-[#2f2f2f] dark:text-white text-black resize-none border-none outline-none"
            placeholder={displayText}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                className={`absolute right-2 bottom-0 p-1 rounded-lg ${
                  input.trim() === "" ? "opacity-50" : ""
                }`}
                onClick={() => {
                  if (input.trim() !== "") askQuestion();
                }}
                disabled={input.trim() === ""}
              >
                {isLoading ? (
                  <div className="absolute right-1 bottom-5 bg-white rounded-full w-8 h-8 hover:bg-gray-400">
                    <Loader className="absolute right-1 bottom-1 text-black animate-spin " />
                  </div>
                ) : (
                  <div className="absolute right-1 bottom-5 bg-white rounded-full w-8 h-8 hover:bg-gray-400">
                    <ArrowUp className="absolute right-1 bottom-1  text-black" />
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent sideOffset={50} align="center">
                <p>
                  {input.trim() !== "" ? "Send Message" : "Message is Empty"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default Landing;
