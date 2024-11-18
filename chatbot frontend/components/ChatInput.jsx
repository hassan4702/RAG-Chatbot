import React from "react";
import { useState, useEffect } from "react";
import { ArrowUp, Loader } from "lucide-react";
import { useSelector } from "react-redux";
import TextareaAutosize from "react-textarea-autosize";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const ChatInput = ({ isLoading, askQuestion, input, setInput }) => {
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    let timeout;
    if (isLoading) {
      setLoadingMessage("Getting context...");
      timeout = setTimeout(() => {
        setLoadingMessage("Generating...");
      }, 2000); // Change message after 2 seconds
    } else {
      setLoadingMessage("");
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  return (
    <div className="absolute bottom-5">
      <div className="flex flex-col items-center gap-2 ">
        <div
          className="
        relative flex-1"
        >
          <TextareaAutosize
            onKeyDownCapture={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevents adding a new line
                askQuestion(); // Call your submit function
              }
            }}
            type="text"
            minRows={1}
            maxRows={7}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="pl-10  pr-4 py-4 rounded-3xl border-none no-scrollbar sm:w-[400px] md:w-[500px] xl:w-[700px] w-[400px] lg:w-[600px] focus:outline-none focus:ring-2 focus:ring-light_main bg-[#2f2f2f] resize-none"
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

export default ChatInput;
