"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import ChatWindow from "@/components/Chat";

const page = () => {
  const messages = useSelector((state) => state.messages.messages);
  const { id } = useParams();
  return (
    <div className="flex justify-center">
      <ChatWindow messages={messages} id={id} />
    </div>
  );
};

export default page;
