import { AI_NAME } from "@/features/theme/theme-config";
import { Avatar, AvatarImage } from "@/features/ui/avatar";
import { Button } from "@/features/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/features/ui/card";
import Link from "next/link";

export default function NoAccess() {
  return (
    <main className="container max-w-lg flex items-center">
      <Card className="flex gap-2 flex-col min-w-[300px]">
        <CardHeader className="gap-2">
          <CardTitle className="text-2xl flex gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={"ai-icon.png"} />
            </Avatar>
            <span className="text-primary">{AI_NAME}</span>
          </CardTitle>
          <CardDescription>Access denied</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>
            Your account is not a member of the security group required to use
            {" "}
            {AI_NAME}.
          </p>
          <p>
            If you believe you should have access, please contact the IT
            Service Desk for support.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Return to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
