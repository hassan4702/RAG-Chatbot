"use client";
import { Earth, PanelRightOpen, SquarePlus } from "lucide-react";
import Link from "next/link";
import React from "react";
import UserAvatar from "./UserAvatar";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { setisActive } from "@/app/features/isActiveSlice";
import { setMessages } from "@/app/features/messagesSlice";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const Navbar = ({ isSidebarOpen, toggleSidebar }) => {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const handleClear = () => {
    dispatch(setisActive(null));
    dispatch(setMessages([]));
  };

  return (
    <nav
      className={`w-full transition-all duration-500 ease-in-out  ${
        isSidebarOpen ? "mr-64" : "mr-0"
      } justify-between dark:bg-light_main text-white p-3 flex flex-row gap-2 items-center`}
    >
      {isSidebarOpen ? (
        <div className="transition ease-in-out delay-150">
          <Link href={"/"} onClick={handleClear}>
            <div className="flex flex-row items-center gap-2">
              <h1 className="text-xl dark:text-[#b4b4b4] text-black font-bold tracking-tighter">
                Geopolitical Analysis System
              </h1>
              <Earth className="dark:text-[#b4b4b4] text-black" />
            </div>
          </Link>
        </div>
      ) : (
        <div className="transition ease-in-out delay-150">
          <div className="gap-2 items-center flex flex-row">
            <PanelRightOpen color="#b4b4b4" onClick={toggleSidebar} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Link href={`/`} onClick={handleClear}>
                    <SquarePlus color="#b4b4b4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Link href={"/"} onClick={handleClear}>
              <div className="flex flex-row items-center gap-2">
                <h1 className="text-xl text-[#b4b4b4] font-bold tracking-tighter ">
                  Geopolitical Analysis System
                </h1>
                <Earth className="text-[#b4b4b4]" />
              </div>
            </Link>
          </div>
        </div>
      )}
      <UserAvatar />
    </nav>
  );
};

export default Navbar;
