"use client";
import React, { useEffect, useState } from "react";

const Size = () => {
  const [screenSize, setScreenSize] = useState("");

  const getScreenSize = (width) => {
    if (width >= 1280) return "xl";
    if (width >= 1024) return "lg";
    if (width >= 768) return "md";
    if (width >= 640) return "sm";
    return "xs";
  };
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenSize(getScreenSize(width));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return (
    <span className="text-sm bg-blue-600 p-2 text-white rounded-md">{`Screen Size: ${screenSize}`}</span>
  );
};

export default Size;
