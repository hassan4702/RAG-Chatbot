import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { LayoutDashboard, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

const UserAvatar = () => {
  const colors = ["blue-500", "red-500", "teal-500", "orange-500"];
  const { data: session, status } = useSession();
  function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
  }
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            // ${getRandomColor()}
            className={`bg-gradient-to-t  rounded-full`}
          >
            {session?.user?.username[0]?.toUpperCase()}
            {session?.user?.username[1]?.toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          {session?.user?.role === "admin" && (
            <Link href="/dashboard">
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-row gap-2">
                  <LayoutDashboard size={20} />
                  Dashboard
                </div>
              </DropdownMenuItem>
            </Link>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <div onClick={signOut} className="flex flex-row gap-2">
              <LogOut size={20} />
              Logout
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserAvatar;
