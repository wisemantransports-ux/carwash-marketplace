'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Car, User, ShoppingCart, Shield } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center mb-12">
        <div className="flex justify-center items-center gap-4 mb-4">
            <svg
                width="60"
                height="60"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
            >
                <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                fill="currentColor"
                />
                <path
                d="M12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18ZM12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8Z"
                fill="currentColor"
                />
                <path
                d="M12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14Z"
                fill="currentColor"
                />
            </svg>
            <h1 className="text-5xl font-bold text-primary font-headline">
            HydroFlow Pro
            </h1>
        </div>
        <p className="text-xl text-muted-foreground mt-2">The ultimate car wash marketplace.</p>
        <p className="text-lg text-muted-foreground mt-8">Select a role to enter the application or sign in.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car /> Customer</CardTitle>
            <CardDescription>Book and manage your car washes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/customer/home')}>
              Enter as Customer
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart /> Business Owner</CardTitle>
            <CardDescription>Manage your services and bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/business/dashboard')}>
              Enter as Business Owner
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield /> Admin</CardTitle>
            <CardDescription>Oversee the marketplace platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/admin/dashboard')}>
              Enter as Admin
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 text-center text-sm">
        <Link href="/login" className="underline text-primary">Or, go to the Login page</Link>
      </div>

      <p className="mt-12 text-sm text-muted-foreground">This is a blueprint for a future mobile app. All screens are designed to be modular.</p>
    </div>
  );
}
