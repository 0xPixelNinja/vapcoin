"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Box, ArrowRight, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

interface TransactionRecord {
  txId: string
  from: string
  to: string
  amount: number
  timestamp: number
  type: string
}

export default function ExplorerPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [bookmark, setBookmark] = useState("")
  const [pageSize] = useState(10)
  
  const fetchTransactions = async (currentBookmark: string = "") => {
    setLoading(true)
    try {
      const userData = localStorage.getItem("user")
      const token = userData ? JSON.parse(userData).token : null
      
      const query = new URLSearchParams({
        pageSize: pageSize.toString(),
        bookmark: currentBookmark,
      })
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (res.status === 401) {
        throw new Error("Unauthorized: Admin access required")
      }
      
      if (!res.ok) throw new Error("Failed to fetch transactions")
      
      const data = await res.json()
      setTransactions(data.records || [])
      setBookmark(data.bookmark)
      
    } catch (error: any) {
      toast.error(error.message || "Failed to load blockchain data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Filter locally for search (since chaincode search is limited in this MVP)
  const filteredTransactions = transactions.filter(tx => {
    const query = searchQuery.toLowerCase()
    return (
      tx.txId.toLowerCase().includes(query) ||
      tx.from.toLowerCase().includes(query) ||
      tx.to.toLowerCase().includes(query) ||
      tx.amount.toString().includes(query)
    )
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Block Explorer</h1>
          <p className="text-muted-foreground">Live view of the VapCoin Ledger</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search TxID, User..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                />
            </div>
            <Button variant="outline" onClick={() => fetchTransactions("")} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions on Page</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
            <p className="text-xs text-muted-foreground">Visible records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger History</CardTitle>
          <CardDescription>Immutable transaction history from Hyperledger Fabric</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>TxID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredTransactions.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No transactions found."}
                    </TableCell>
                    </TableRow>
                ) : (
                    filteredTransactions.map((tx) => (
                    <TableRow key={tx.txId}>
                        <TableCell>
                        <Badge variant={tx.type === "mint" ? "default" : "secondary"}>
                            {tx.type}
                        </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[150px] truncate" title={tx.txId}>
                        {tx.txId}
                        </TableCell>
                        <TableCell>{tx.from}</TableCell>
                        <TableCell>
                        <div className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            {tx.to}
                        </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                        {tx.amount} VAP
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(tx.timestamp * 1000).toLocaleString()}
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                  fetchTransactions("")
              }}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Reset / First Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransactions(bookmark)}
              disabled={!bookmark || loading}
            >
              Next Page
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
