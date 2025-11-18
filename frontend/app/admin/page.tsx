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
import { toast } from "sonner";
import { LogOut, Send, PlusCircle, RefreshCw, FileText, Download, Upload } from "lucide-react";

interface User {
  username: string;
  role: string;
  token: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bookmark, setBookmark] = useState("");
  const [hasMore, setHasMore] = useState(false);
  
  // Transfer State
  const [transferAmount, setTransferAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Mint State
  const [mintAmount, setMintAmount] = useState("");
  const [isMintOpen, setIsMintOpen] = useState(false);

  // Restore State
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "admin") {
      router.push("/");
      return;
    }
    setUser(parsedUser);
    fetchBalance(parsedUser.username, parsedUser.token);
    fetchTransactions(parsedUser.token);
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

  const fetchTransactions = async (token: string, loadMore = false) => {
    try {
      const query = new URLSearchParams({
        pageSize: "4",
        bookmark: loadMore ? bookmark : "",
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions?${query}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      
      const newRecords = data.records || [];
      
      if (loadMore) {
        setTransactions(prev => [...prev, ...newRecords]);
      } else {
        setTransactions(newRecords);
      }

      setBookmark(data.bookmark);
      setHasMore(data.recordsCount === 4 && data.bookmark !== "");
    } catch (error) {
      console.error(error);
      if (!loadMore) setTransactions([]);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mint`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({ amount: parseFloat(mintAmount) }),
      });

      if (!res.ok) throw new Error("Mint failed");

      toast.success(`Successfully minted ${mintAmount} VapCoins`);
      setMintAmount("");
      setIsMintOpen(false);
      fetchBalance(user.username, user.token);
      fetchTransactions(user.token);
    } catch (error) {
      toast.error("Minting failed");
    } finally {
      setLoading(false);
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

      toast.success(`Sent ${transferAmount} VAP to ${recipient}`);
      setTransferAmount("");
      setRecipient("");
      setIsTransferOpen(false);
      fetchBalance(user.username, user.token);
      fetchTransactions(user.token);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/backup`, {
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error("Backup failed");
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vapcoin_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Backup downloaded successfully");
    } catch (error) {
      toast.error("Failed to download backup");
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile || !user) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/restore`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.token}`
          },
          body: JSON.stringify(json),
        });

        if (!res.ok) throw new Error("Restore failed");
        const data = await res.json();
        toast.success(data.message || "Restore successful");
        setIsRestoreOpen(false);
        setRestoreFile(null);
      } catch (error) {
        toast.error("Failed to restore data. Invalid file or server error.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(restoreFile);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-bold">VapCoin Admin</h1>
            <p className="text-sm text-slate-400">System Administrator</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-slate-800">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* Balance Card */}
        <Card className="bg-slate-800 text-white shadow-lg border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Admin Reserve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{balance} <span className="text-xl font-normal opacity-80">VAP</span></div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white border-none"
              onClick={() => { fetchBalance(user.username, user.token); fetchTransactions(user.token); }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          {/* Mint Button */}
          <Dialog open={isMintOpen} onOpenChange={setIsMintOpen}>
            <DialogTrigger asChild>
              <Button className="h-24 flex flex-col gap-2 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white">
                <PlusCircle className="h-8 w-8" />
                <span>Mint Coins</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Mint New Coins</DialogTitle>
                <DialogDescription>Create new VapCoins and add to Admin Reserve.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMint} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="mintAmount">Amount to Mint</Label>
                  <Input 
                    id="mintAmount" 
                    type="number" 
                    min="1" 
                    value={mintAmount} 
                    onChange={(e) => setMintAmount(e.target.value)} 
                    placeholder="1000"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? "Minting..." : "Confirm Mint"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Transfer Button */}
          <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogTrigger asChild>
              <Button className="h-24 flex flex-col gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white">
                <Send className="h-8 w-8" />
                <span>Distribute</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Distribute Coins</DialogTitle>
                <DialogDescription>Send coins from Reserve to Users.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Username</Label>
                  <Input 
                    id="recipient" 
                    value={recipient} 
                    onChange={(e) => setRecipient(e.target.value)} 
                    placeholder="student1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    min="1" 
                    value={transferAmount} 
                    onChange={(e) => setTransferAmount(e.target.value)} 
                    placeholder="100"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? "Sending..." : "Confirm Transfer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Backup & Restore */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">System Management</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="flex gap-2" onClick={handleBackup}>
              <Download className="h-4 w-4" /> Backup Data
            </Button>
            
            <Dialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Upload className="h-4 w-4" /> Restore Data
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Restore Data</DialogTitle>
                  <DialogDescription>Upload a backup JSON file to restore users.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRestore} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Backup File</Label>
                    <Input 
                      id="file" 
                      type="file" 
                      accept=".json"
                      onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !restoreFile}>
                    {loading ? "Restoring..." : "Restore Data"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Block Explorer */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Block Explorer</h2>
          </div>
          
          <div className="space-y-3">
            {transactions.length === 0 ? (
               <Card>
                <CardContent className="p-4 text-center text-gray-500 text-sm">
                  No transactions found on the ledger.
                </CardContent>
              </Card>
            ) : (
              transactions.map((tx, i) => (
                <Card key={i} className="overflow-hidden border-l-4 border-l-blue-500">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600 truncate max-w-[200px]">
                            {tx.txId}
                        </span>
                        <span className="text-xs text-slate-400">
                            {new Date(tx.timestamp * 1000).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700">
                                {tx.from} <span className="text-slate-400">→</span> {tx.to}
                            </span>
                            <span className="text-xs text-slate-500 capitalize">{tx.type}</span>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-slate-800">{tx.amount} VAP</span>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {hasMore && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => fetchTransactions(user.token, true)}
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
