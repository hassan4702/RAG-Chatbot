"use client";
import Image from "next/image";
import Link from "next/link";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { signIn } from "next-auth/react";
import Globe from "./ui/globe";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  emailAddress: z.string().email(),
  password: z.string().min(4),
});
export default function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailAddress: "",
      password: "",
    },
  });
  const handleSubmit_form = async (e) => {
    const email = form.getValues().emailAddress;
    const password = form.getValues().password;
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res.error) {
        toast({
          title: "Invalid Credentials",
          status: "error",
          description: "Please check your email and password",
          varient: "destructive",
        });
        return;
      }

      router.replace("/");
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <main className="w-full bg-black h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <Globe />
      </div>
      <div className="relative z-10 w-[350px]">
        <div className="bg-light_main bg-opacity-97 p-6 rounded-lg shadow-lg">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <div className="grid gap-4 mt-6">
            <Form {...form}>
              <form
                className="grid gap-3"
                onSubmit={form.handleSubmit(handleSubmit_form)}
              >
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                <Button type="submit" className="w-full mt-2">
                  Login
                </Button>
              </form>
            </Form>
          </div>
          <div className="mt-4 text-center text-sm">
            Contact admin if you don&apos;t have an account
          </div>
        </div>
      </div>
    </main>
  );
}
