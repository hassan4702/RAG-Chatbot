"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
export default function UserManagement() {
  const { data: session } = useSession();
  const [message, setMessage] = useState(null);

  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const formSchema = z
    .object({
      username: z
        .string()
        .min(3)
        .regex(/^\S*$/, "Username cannot contain spaces"),
      emailAddress: z
        .string()
        .email("Invalid email address")
        .max(100, "Email must be 100 characters or less"),
      role: z.enum(["user", "admin"]),
      password: z.string().min(8),
      passwordConfirmation: z.string().min(8),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: "Passwords do not match.",
      path: ["passwordConfirmation"],
    });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      emailAddress: "",
      role: "user",
      password: "",
      passwordConfirmation: "",
    },
  });
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_API_URL + "/users"
      );
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session, message]);

  const confirmDelete = async (id) => {
    try {
      const response = await axios.delete(
        process.env.NEXT_PUBLIC_API_URL + `/users/${id}`
      );
      if (response.status === 200) {
        setUsers(users.filter((user) => user.id !== id));
        toast({ title: "User Deleted Successfully" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };
  const openDeleteDialog = (id) => {
    setSelectedUserId(id); // Set the selected user ID for deletion
  };

  const closeDeleteDialog = () => {
    setSelectedUserId(null); // Reset selected user ID when dialog is closed
  };

  const handleSubmit_form = async () => {
    const { username, emailAddress, password, role } = form.getValues();

    try {
      const res = await axios.post(
        process.env.NEXT_PUBLIC_API_URL + "/register",
        {
          username,
          email: emailAddress,
          password,
          role, // Include role in the request payload
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (res.status === 200) {
        setMessage({ type: "success", text: "User Added successfully" });
        toast({
          title: "User Registered Sucessfully",
          //   description: "Friday, February 10, 2023 at 5:57 PM",
        });
        form.reset();
      } else {
        toast({
          title: "Error",
          status: "error",
          description: "Failed to register user",
          varient: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        status: "error",
        description: error.response.data.message,
        varient: "destructive",
      });
    }
  };
  const deleteUser = async (id) => {
    try {
      // make api call to delete user
      try {
        const response = await axios.delete(
          process.env.NEXT_PUBLIC_API_URL + `/users/${id}`
        );
        if (response.status !== 200) {
          toast({
            title: "User Deleted Sucessfully",
            //   description: "Friday, February 10, 2023 at 5:57 PM",
          });
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
    setUsers(users.filter((user) => user.id !== id));
    setMessage({ type: "success", text: "User deleted successfully" });
  };

  return (
    <Card className="w-full  h-full bg-dark_main mx-auto">
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Register new users or delete existing ones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="register" className="flex h-full">
          <TabsList className="flex flex-col h-auto space-y-2 mr-4 justify-start bg-transparent ">
            <TabsTrigger
              value="register"
              className="w-40 justify-start hover:bg-light_main"
            >
              Register User
            </TabsTrigger>
            <TabsTrigger value="delete" className="w-40 justify-start">
              Delete User
            </TabsTrigger>
          </TabsList>
          <div className="flex-1">
            <TabsContent value="register">
              <Form {...form}>
                <form
                  className="grid gap-3"
                  onSubmit={form.handleSubmit(handleSubmit_form)}
                >
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>User name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="User name"
                              type="text"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="emailAddress"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Email address"
                              type="email"
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    .replace(/\s/g, "")
                                    .toLowerCase()
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full text-start"
                              >
                                {field.value === "admin" ? "Admin" : "User"}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="center"
                              className="w-56"
                            >
                              <DropdownMenuRadioGroup
                                {...field}
                                value={field.value}
                                onValueChange={(value) => field.onChange(value)}
                              >
                                <DropdownMenuRadioItem value="admin">
                                  Admin
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="user">
                                  User
                                </DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Password"
                              type="password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="passwordConfirmation"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Re-Enter Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Password"
                              type="password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <Button type="submit" className="w-full">
                    Sign up
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="delete">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-light_main"
                    >
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </DialogTrigger>
                        {selectedUserId === user.id && (
                          <DialogContent>
                            <DialogHeader>
                              <h3>Confirm Deletion</h3>
                              <p>Are you sure you want to delete this user?</p>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="secondary"
                                onClick={closeDeleteDialog}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  confirmDelete(user.id);
                                  closeDeleteDialog();
                                }}
                              >
                                Confirm
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
        <div className="mt-4 text-sm text-gray-500">
          Total users: {users.length}
        </div>
      </CardContent>
    </Card>
  );
}
