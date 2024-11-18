"use client";
import React, { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { FileText, Trash2, Upload, Loader, CheckCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Label } from "@radix-ui/react-dropdown-menu";

const PdfUpload = () => {
  const [pdfs, setPdfs] = useState([]);
  const [isUploading, setIsUploading] = useState(false); // State for loading spinner
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState(""); // State to store success message
  const [pdfView, setPdfView] = useState([]);

  useEffect(() => {
    handlePdfView();
  }, []);

  useEffect(() => {
    handlePdfView();
  }, [isUploading]);

  const handlePdfView = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + "/pdfs", {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        setPdfView(result.unique_file_names); // Store success message
      } else {
        const errorResult = await response.json();
        alert(errorResult.detail || "Failed to upload files");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("An error occurred while uploading files");
    }
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;

    if (files) {
      const pdfs = Array.from(files)
        .filter((file) => file.type === "application/pdf") // Ensure each file is a PDF
        .map((file) => ({
          id: Date.now() + Math.random(), // Generate a unique ID
          name: file.name,
          file,
        }));

      if (pdfs.length > 0) {
        setPdfs((prevPdfs) => [...prevPdfs, ...pdfs]); // Add new PDFs to the existing array
        event.target.value = "";
      } else {
        alert("Please upload PDF files only");
      }
    }
  };

  const handleDelete_selected = (id) => {
    setPdfs(pdfs.filter((pdf) => pdf.id !== id.id));
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL + "/delete_pdfs",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: id }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setPdfView(pdfView.filter((pdf) => pdf !== id));
        alert(result.message);
      }
    } catch (error) {
      console.error("Error deleting files:", error);
      alert("An error occurred while deleting files");
    }
  };

  const handleUploadAll = async () => {
    if (pdfs.length === 0) {
      alert("Please choose some files to upload");
      return;
    }
    const formData = new FormData();
    pdfs.forEach((pdf) => {
      formData.append("files", pdf.file);
    });

    setIsUploading(true); // Start the loading spinner and overlay
    setUploadSuccessMessage(""); // Clear previous success message

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL + "/upload_pdfs",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        setUploadSuccessMessage(result.message); // Store success message
        setPdfs([]);
      } else {
        const errorResult = await response.json();
        alert(errorResult.detail || "Failed to upload files");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("An error occurred while uploading files");
    } finally {
      setIsUploading(false); // Stop the loading spinner and overlay after upload completes
    }
  };

  return (
    <main className="flex-1 overflow-auto   ">
      {(isUploading || uploadSuccessMessage) && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center 
            ${
              uploadSuccessMessage
                ? "bg-green-500 bg-opacity-50"
                : "bg-gray-800 bg-opacity-50"
            } 
            backdrop-blur-sm`}
        >
          <div className="flex flex-col items-center space-y-4">
            {uploadSuccessMessage ? (
              <>
                <CheckCircle className="h-16 w-16 text-white" />
                <p className="text-white text-lg">{uploadSuccessMessage}</p>
                <Button
                  onClick={() => setUploadSuccessMessage("")}
                  className="text-white bg-gray-800 bg-opacity-30 hover:bg-opacity-80 hover:text-black hover:shadow-md"
                >
                  OK
                </Button>
              </>
            ) : (
              <>
                <Loader className="h-12 w-12 animate-spin text-white" />
                <p className="text-white text-lg">
                  Please be patient, this process may take a while!
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold">Upload PDFs</h2>
        <div className="flex items-center space-x-2 flex-row">
          <Input type="file" accept=".pdf" onChange={handleFileUpload} />
          <Button onClick={handleUploadAll}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      <div
        className={`grid gap-4 w-full ${
          pdfs.length === 0 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {pdfs.length > 0 && (
          <div className="mb-4">
            <Label className="text-lg font-semibold">
              Selected PDFs {`(${pdfs.length})`}
            </Label>
            <ScrollArea className="h-[calc(100vh-270px)] w-full rounded-md border shadow-lg bg-dark_main ">
              {pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="flex items-center justify-between p-4 hover:bg-light_main border-b"
                >
                  <span className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-blue-500" />
                    {pdf.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete_selected(pdf)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        <div className="mb-4">
          <Label className="text-lg font-semibold mb-2">
            Uploaded PDFs {`(${pdfView.length})`}
          </Label>
          <ScrollArea className="h-[calc(100vh-270px)] w-full rounded-md border shadow-lg bg-dark_main">
            {pdfView.map((pdf) => (
              <div
                key={pdf}
                className="flex items-center justify-between p-4 hover:bg-light_main border-b"
              >
                <span className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-500" />
                  {pdf}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(pdf)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            {pdfView.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No PDFs uploaded yet.
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </main>
  );
};
export default PdfUpload;
