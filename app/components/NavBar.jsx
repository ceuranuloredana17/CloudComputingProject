"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function NavBar() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <div className="flex gap-3 items-center">
      <Link href="/sign-in" className="text-sm">Sign in</Link>
      <Link href="/sign-up" className="text-sm">Sign up</Link>
    </div>
  );
}
