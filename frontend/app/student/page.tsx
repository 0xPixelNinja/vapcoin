"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Scanner } from "@yudiel/react-qr-scanner";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { LogOut, QrCode, Send, ArrowDownLeft, RefreshCw } from "lucide-react";
import { TransactionList } from "@/components/TransactionList";

interface User {
  username: string;
  role: string;
  token: string;
}

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "student") {
      router.push("/"); // Redirect if not student
      return;
    }
    setUser(parsedUser);
    fetchBalance(parsedUser.username, parsedUser.token);
    fetchHistory(parsedUser.username, parsedUser.token);
  }, [router]);

  const fetchBalance = async (username: string, token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/balance/${username}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch balance");
      const data = await res.json();
      setBalance(data.balance);
    } catch (error) {
      console.error(error);
      toast.error("Could not load balance");
    }
  };

  const [history, setHistory] = useState<any[]>([]);
  const [bookmark, setBookmark] = useState("");
  const [hasMore, setHasMore] = useState(false);

  const fetchHistory = async (username: string, token: string, loadMore = false) => {
    try {
      const query = new URLSearchParams({
        pageSize: "4",
        bookmark: loadMore ? bookmark : "",
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history/${username}?${query}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      
      const newRecords = data.records || [];
      
      if (loadMore) {
        setHistory(prev => [...prev, ...newRecords]);
      } else {
        setHistory(newRecords);
      }

      setBookmark(data.bookmark);
      setHasMore(data.recordsCount === 4 && data.bookmark !== ""); // Assuming pageSize is 4
    } catch (error) {
      console.error(error);
      if (!loadMore) setHistory([]);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transfer`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({
          from: user.username,
          to: recipient,
          amount: parseFloat(transferAmount),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transfer failed");
      }

      toast.success(`Successfully sent ${transferAmount} VapCoins to ${recipient}`);
      setTransferAmount("");
      setRecipient("");
      setIsTransferOpen(false);
      fetchBalance(user.username, user.token);
      fetchHistory(user.username, user.token);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (result: string) => {
    if (result) {
      setRecipient(result);
      setIsScanOpen(false);
      setIsTransferOpen(true); // Open transfer dialog with recipient pre-filled
      toast.success("QR Code scanned!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-bold text-primary">VapCoin</h1>
            <p className="text-sm text-gray-500">Welcome, {user.username}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* Balance Card */}
        <Card className="bg-primary text-primary-foreground shadow-lg border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{balance} <span className="text-xl font-normal opacity-80">VAP</span></div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white border-none"
              onClick={() => { fetchBalance(user.username, user.token); fetchHistory(user.username, user.token); }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          {/* Send Button */}
          <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-24 flex flex-col gap-2 shadow-sm hover:bg-gray-50">
                <Send className="h-8 w-8 text-blue-600" />
                <span>Send</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Send VapCoins</DialogTitle>
                <DialogDescription>Transfer coins to another student or merchant.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Username</Label>
                  <Input 
                    id="recipient" 
                    value={recipient} 
                    onChange={(e) => setRecipient(e.target.value)} 
                    placeholder="e.g. merchant1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    min="1" 
                    step="1"
                    value={transferAmount} 
                    onChange={(e) => setTransferAmount(e.target.value)} 
                    placeholder="0"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Confirm Transfer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Scan Button */}
          <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-24 flex flex-col gap-2 shadow-sm hover:bg-gray-50">
                <QrCode className="h-8 w-8 text-purple-600" />
                <span>Scan</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>Scan QR Code</DialogTitle>
              </DialogHeader>
              <div className="aspect-square w-full relative">
                 <Scanner 
                    onScan={(result) => {
                        if (result && result.length > 0) {
                            handleScan(result[0].rawValue);
                        }
                    }}
                    onError={(error: any) => {
                        console.error(error);
                        toast.error("Camera Error: " + (error?.message || "Unknown error"));
                    }}
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Receive Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-24 flex flex-col gap-2 shadow-sm hover:bg-gray-50">
                <ArrowDownLeft className="h-8 w-8 text-green-600" />
                <span>Receive</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Receive VapCoins</DialogTitle>
                <DialogDescription>Show this QR code to receive payments.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <div className="p-4 bg-white rounded-xl shadow-md">
                  <QRCode value={user.username} size={200} />
                </div>
                <p className="font-mono text-lg font-bold">{user.username}</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <TransactionList 
            transactions={history} 
            role="student" 
            username={user.username}
            loading={false}
            onLoadMore={hasMore ? () => fetchHistory(user.username, user.token, true) : undefined}
            hasMore={hasMore}
          />
        </div>
      </main>
    </div>
  );
}
