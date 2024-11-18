"use client";
import {
  Ellipsis,
  PanelRightClose,
  PencilLine,
  SquarePlus,
  Trash,
} from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { isToday, isYesterday, isSameWeek, subDays } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { setMessages } from "@/app/features/messagesSlice";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { setisActive } from "@/app/features/isActiveSlice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "./ui/button";
import { toggleupdateSidebar } from "@/app/features/updateSidebarSlice";
import { useToast } from "@/hooks/use-toast";

function isPast7Days(date) {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  return date >= sevenDaysAgo && date <= today;
}

const Sidebar = ({ toggleSidebar }) => {
  const { toast } = useToast();
  const isActive = useSelector((state) => state.isActive.isActive);
  const [activeChatId, setActiveChatId] = useState(null);
  const updateSidebar = useSelector(
    (state) => state.updateSidebar.updateSidebar
  );
  const [title, setTitle] = useState("");
  const [isDialogOpen, setisDialogOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const [history, setHistory] = useState([]); // Chat history
  const dispatch = useDispatch();
  const [chatid, setChatid] = useState();
  const openDialog = (id, title) => {
    setTitle(title);
    setActiveChatId(id);
    setisDialogOpen(true);
  };

  const groupedHistory = history
    .sort((a, b) => new Date(b.time_stamp) - new Date(a.time_stamp)) // Sort by newest first
    .reduce(
      (acc, item) => {
        const date = new Date(item.time_stamp);

        // Group by time period
        if (isToday(date)) {
          acc.today.push(item);
        } else if (isYesterday(date)) {
          acc.yesterday.push(item);
        } else if (isPast7Days(date)) {
          acc.last7Days.push(item);
        } else {
          acc.older.push(item);
        }
        return acc;
      },
      { today: [], yesterday: [], last7Days: [], older: [] }
    );
  const handleClear = () => {
    dispatch(setisActive(null));
    dispatch(setMessages([]));
  };
  const getLastPart = (str) => {
    const parts = str.split("-");
    return parts[parts.length - 1];
  };
  const fetchTitles = async () => {
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_API_URL + `/chat_titles/${session?.user?.id}`
      );
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching chat titles:", error);
    }
  };
  useEffect(() => {
    if (updateSidebar || !updateSidebar) {
      setTimeout(() => {
        fetchTitles();
      }, 1000);
    }
    fetchTitles();
  }, [session, updateSidebar]);

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/${id}`
      );
      const newHistory = history.filter((item) => item.id !== id);
      setHistory(newHistory);
      dispatch(setMessages([]));
      toast({
        title: "Chat deleted successfully",
        status: "success",
      });
      router.push("/");
    } catch (error) {
      console.error("Error deleting chat data:", error);
    }
  };

  const handleClick = async (id) => {
    dispatch(setisActive(id));
    setChatid(id);
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_API_URL + `/chat_memory/${id}`
      );
      dispatch(setMessages(response.data.chat_memory.store.chat_history));
      const chatId = getLastPart(response.data.id);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error("Error fetching chat data:", error);
    }
    // dispatch(setMessages([{ text: title, isUser: false }]));
  };

  const handleUpdatetitle = async () => {
    if (!activeChatId) return;

    try {
      const response = await axios.put(
        process.env.NEXT_PUBLIC_API_URL + `/update-title/${activeChatId}`,
        {
          title: title,
        }
      );
      setisDialogOpen(false);
      toast({
        title: "Title updated successfully",
        status: "success",
      });
      setActiveChatId(null);
      dispatch(toggleupdateSidebar());
    } catch (error) {
      console.error("Error fetching chat data:", error);
    }
  };

  return (
    <div>
      <div className="flex  mt-1 flex-row justify-between items-center dark:text-white text-black">
        <PanelRightClose color="#b4b4b4" onClick={toggleSidebar} />
        <div className="flex flex-row gap-2 ">
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
        </div>
      </div>
      <ScrollArea className=" w-full mt-2 h-[calc(100vh-70px)]">
        {/* Render Today Chats */}
        {groupedHistory.today.length > 0 && (
          <>
            <p className="text-gray-500 px-2 mt-4 text-sm">Today</p>
            {groupedHistory.today.map((item, index) => (
              <ChatItem
                key={index}
                item={item}
                handleClick={handleClick}
                handleDelete={handleDelete}
                chatId={isActive}
                openDialog={() => openDialog(item.id, item.title)}
                setisDialogOpen={setisDialogOpen}
                isDialogOpen={isDialogOpen && activeChatId === item.id}
                handleUpdatetitle={handleUpdatetitle}
                title={title}
                setTitle={setTitle}
              />
            ))}
          </>
        )}

        {/* Render Yesterday Chats */}
        {groupedHistory.yesterday.length > 0 && (
          <>
            <p className="text-gray-500 px-2 mt-4 text-sm">Yesterday</p>
            {groupedHistory.yesterday.map((item, index) => (
              <ChatItem
                key={index}
                item={item}
                handleClick={handleClick}
                handleDelete={handleDelete}
                chatId={isActive}
                openDialog={() => openDialog(item.id, item.title)}
                setisDialogOpen={setisDialogOpen}
                isDialogOpen={isDialogOpen && activeChatId === item.id}
                handleUpdatetitle={handleUpdatetitle}
                title={title}
                setTitle={setTitle}
              />
            ))}
          </>
        )}

        {/* Render Last 7 Days Chats */}
        {groupedHistory.last7Days.length > 0 && (
          <>
            <p className="text-gray-500 text-sm px-2 mt-4">Last 7 Days</p>
            {groupedHistory.last7Days.map((item, index) => (
              <ChatItem
                key={index}
                item={item}
                handleClick={handleClick}
                handleDelete={handleDelete}
                chatId={isActive}
                openDialog={() => openDialog(item.id, item.title)}
                setisDialogOpen={setisDialogOpen}
                isDialogOpen={isDialogOpen && activeChatId === item.id}
                handleUpdatetitle={handleUpdatetitle}
                title={title}
                setTitle={setTitle}
              />
            ))}
          </>
        )}

        {/* Render Older Chats */}
        {groupedHistory.older.length > 0 && (
          <>
            <p className="text-gray-500 text-sm px-2 mt-4">Older</p>
            {groupedHistory.older.map((item, index) => (
              <ChatItem
                key={index}
                item={item}
                handleClick={handleClick}
                handleDelete={handleDelete}
                chatId={isActive}
                openDialog={() => openDialog(item.id, item.title)}
                setisDialogOpen={setisDialogOpen}
                isDialogOpen={isDialogOpen && activeChatId === item.id}
                handleUpdatetitle={handleUpdatetitle}
                title={title}
                setTitle={setTitle}
              />
            ))}
          </>
        )}
      </ScrollArea>
    </div>
  );
};
const ChatItem = ({
  item,
  handleClick,
  handleDelete,
  chatId,
  isDialogOpen,
  openDialog,
  setisDialogOpen,
  handleUpdatetitle,
  title,
  setTitle,
}) => (
  <div
    className={`flex flex-row justify-between items-center px-1 rounded-md ${
      item.id === chatId
        ? "dark: bg-light_main text-white "
        : "hover:bg-light_main"
    }`}
  >
    <button
      className="w-full items-start flex flex-row gap-2  p-2 rounded-md max-w-[calc(100%-30px)]"
      onClick={() => handleClick(item.id)}
    >
      <p className="truncate text-sm dark:text-text_secondary text-black whitespace-nowrap max-w-[100%]">
        {item.title}
      </p>
    </button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Ellipsis className="mr-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-dark_main" align="start">
        <DropdownMenuItem onClick={openDialog}>
          <p className="flex flex-row items-center gap-2 font-semibold">
            <PencilLine size={18} />
            Rename
          </p>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(item.id)}>
          <p className="flex flex-row items-center gap-2 text-red-600 font-semibold">
            <Trash color="red" size={18} />
            Delete
          </p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={isDialogOpen} onOpenChange={setisDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit title</DialogTitle>
          <DialogDescription>
            Make changes to your title here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1 py-4">
          <div className="grid grid-cols-1 gap-3 items-center ">
            <Label htmlFor="name" className="text-left">
              New title :
            </Label>
            <Input
              value={title}
              id="name"
              defaultValue=""
              className="col-span-3"
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            className="bg-white text-black"
            onClick={handleUpdatetitle}
            disabled={!title.trim() || item.title === title}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
export default Sidebar;
