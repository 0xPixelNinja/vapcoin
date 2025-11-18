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
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { LogOut, ArrowDownLeft, RefreshCw, History } from "lucide-react";

interface User {
  username: string;
  role: string;
}

export default function MerchantDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [bookmark, setBookmark] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "merchant") {
      router.push("/");
      return;
    }
    setUser(parsedUser);
    fetchBalance(parsedUser.username);
    fetchHistory(parsedUser.username);
  }, [router]);

  const fetchBalance = async (username: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/balance/${username}`);
      if (!res.ok) throw new Error("Failed to fetch balance");
      const data = await res.json();
      setBalance(data.balance);
    } catch (error) {
      console.error(error);
      toast.error("Could not load balance");
    }
  };

  const fetchHistory = async (username: string, loadMore = false) => {
    try {
      const query = new URLSearchParams({
        pageSize: "4",
        bookmark: loadMore ? bookmark : "",
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history/${username}?${query}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      
      const newRecords = data.records || [];
      
      if (loadMore) {
        setHistory(prev => [...prev, ...newRecords]);
      } else {
        setHistory(newRecords);
      }

      setBookmark(data.bookmark);
      setHasMore(data.recordsCount === 4 && data.bookmark !== "");
    } catch (error) {
      console.error(error);
      if (!loadMore) setHistory([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-teal-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-bold text-teal-700">VapCoin Merchant</h1>
            <p className="text-sm text-gray-500">{user.username}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* Balance Card */}
        <Card className="bg-teal-600 text-white shadow-lg border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Merchant Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{balance} <span className="text-xl font-normal opacity-80">VAP</span></div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white border-none"
              onClick={() => { fetchBalance(user.username); fetchHistory(user.username); }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Receive Action */}
        <div className="grid grid-cols-1 gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-32 flex flex-col gap-2 shadow-md text-lg bg-white text-teal-700 hover:bg-gray-50 border-2 border-teal-100">
                <ArrowDownLeft className="h-12 w-12" />
                <span>Show QR to Receive</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Receive Payment</DialogTitle>
                <DialogDescription>Ask the student to scan this code.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <div className="p-4 bg-white rounded-xl shadow-md border-2 border-teal-500">
                  <QRCode value={user.username} size={220} />
                </div>
                <p className="font-mono text-2xl font-bold text-teal-800">{user.username}</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-teal-900">Transaction History</h2>
          </div>
          
          <div className="space-y-3">
            {history.length === 0 ? (
               <Card>
                <CardContent className="p-4 text-center text-gray-500 text-sm">
                  No transactions found.
                </CardContent>
              </Card>
            ) : (
              history.map((tx, i) => {
                const isSender = tx.from === user.username;
                return (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-3 flex justify-between items-center">
                      <div className="flex flex-col">
                          <span className="text-xs text-gray-400 font-mono">{tx.txId.substring(0, 8)}...</span>
                          <span className="text-sm font-medium">
                             {isSender ? `Sent to ${tx.to}` : `Received from ${tx.from}`}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(tx.timestamp * 1000).toLocaleDateString()}
                          </span>
                      </div>
                      <div className="text-right">
                          <span className={`font-bold ${isSender ? 'text-red-500' : 'text-teal-600'}`}>
                            {isSender ? '-' : '+'}{tx.amount} VAP
                          </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}

            {hasMore && (
              <Button 
                variant="outline" 
                className="w-full border-teal-200 text-teal-700 hover:bg-teal-50" 
                onClick={() => fetchHistory(user.username, true)}
              >
                Load More
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
