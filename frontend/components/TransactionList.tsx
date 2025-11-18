"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Search, ExternalLink, ArrowRight, Clock, Box } from "lucide-react"
import { useRouter } from "next/navigation"

interface TransactionRecord {
  txId: string
  from: string
  to: string
  amount: number
  timestamp: number
  type: string
}

interface TransactionListProps {
  transactions: TransactionRecord[]
  role: string
  username?: string
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

export function TransactionList({ transactions, role, username, loading, onLoadMore, hasMore }: TransactionListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null)
  const router = useRouter()

  const filteredTransactions = transactions.filter(tx => {
    const query = searchQuery.toLowerCase()
    return (
      tx.txId.toLowerCase().includes(query) ||
      tx.from.toLowerCase().includes(query) ||
      tx.to.toLowerCase().includes(query) ||
      tx.amount.toString().includes(query)
    )
  })

  const handleTxClick = (tx: TransactionRecord) => {
    setSelectedTx(tx)
  }

  const handleVerifyClick = () => {
    if (selectedTx) {
      router.push(`/verify?txId=${selectedTx.txId}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-gray-500 text-sm">
              No transactions found.
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((tx, i) => {
            const isSender = username ? tx.from === username : false
            const isReceiver = username ? tx.to === username : false
            
            // Determine color based on role and direction
            let amountColor = "text-slate-800"
            let sign = ""
            
            if (username) {
                if (isSender) {
                    amountColor = "text-red-500"
                    sign = "-"
                } else if (isReceiver) {
                    amountColor = "text-green-500"
                    sign = "+"
                }
            }

            return (
              <Card 
                key={i} 
                className="overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleTxClick(tx)}
              >
                <CardContent className="p-3 flex justify-between items-center">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs text-gray-400 font-mono truncate max-w-[150px]">
                      {tx.txId}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {username 
                        ? (isSender ? `Sent to ${tx.to}` : `Received from ${tx.from}`)
                        : `${tx.from} → ${tx.to}`
                      }
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(tx.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right pl-2">
                    <span className={`font-bold ${amountColor} whitespace-nowrap`}>
                      {sign}{tx.amount} VAP
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}

        {hasMore && onLoadMore && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        )}
      </div>

      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              View details and verify on the blockchain.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTx && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Confirmed
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span>{new Date(selectedTx.timestamp * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize">{selectedTx.type}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-bold text-sm">{selectedTx.from}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-bold text-sm">{selectedTx.to}</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-3xl font-bold text-primary">{selectedTx.amount} VAP</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Transaction Hash</p>
                <p className="text-xs font-mono bg-slate-100 p-2 rounded break-all">
                    {selectedTx.txId}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-start">
            <Button 
                type="button" 
                variant="secondary" 
                className="w-full"
                onClick={handleVerifyClick}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Verify on Public Explorer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CheckCircle2(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  }
