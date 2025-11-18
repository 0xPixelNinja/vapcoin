"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, CheckCircle2, XCircle, Clock, ArrowRight, Box } from "lucide-react"
import { toast } from "sonner"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

interface TransactionRecord {
  txId: string
  from: string
  to: string
  amount: number
  timestamp: number
  type: string
}

function VerifyContent() {
  const searchParams = useSearchParams()
  const initialTxId = searchParams.get("txId") || ""
  
  const [txId, setTxId] = useState(initialTxId)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TransactionRecord | null>(null)
  const [error, setError] = useState("")

  // Auto-verify if txId is present in URL on load
  // We use a ref or just check if result is null to avoid loops, but useEffect is better
  // However, for simplicity, let's just pre-fill. 
  // If we want auto-verify:
  /*
  useEffect(() => {
    if (initialTxId) {
        handleVerify(initialTxId)
    }
  }, [])
  */

  const handleVerify = async (idToVerify?: string) => {
    const id = idToVerify || txId
    if (!id) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      // No token needed for public route now
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transaction/${id}`)

      if (!res.ok) {
        throw new Error("Transaction not found on the ledger")
      }

      const data = await res.json()
      setResult(data)
      toast.success("Transaction verified on blockchain")
    } catch (err: any) {
      setError(err.message)
      toast.error("Verification failed")
    } finally {
      setLoading(false)
    }
  }
  
  // Trigger verify if we have an initial ID and haven't verified yet
  // Using a simple effect
  useState(() => {
      if (initialTxId) {
          handleVerify(initialTxId)
      }
  })

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Blockchain Audit</h1>
        <p className="text-muted-foreground">
          Verify any transaction's authenticity directly against the Hyperledger Fabric ledger.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verify Transaction</CardTitle>
          <CardDescription>
            Enter the Transaction Hash (TxID) to verify its existence and immutability.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter TxID (e.g., 8f2c...)"
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
              className="font-mono"
            />
            <Button onClick={() => handleVerify()} disabled={loading}>
              {loading ? "Verifying..." : <><Search className="mr-2 h-4 w-4" /> Verify</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6 flex items-center gap-4 text-destructive">
            <XCircle className="h-8 w-8" />
            <div>
              <p className="font-semibold">Verification Failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-bold text-lg">Transaction Verified</span>
            </div>
            <CardTitle className="font-mono text-sm break-all">{result.txId}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold">Timestamp</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">
                    {new Date(result.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold">Type</span>
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{result.type}</span>
                </div>
              </div>
            </div>

            <div className="bg-background p-4 rounded-lg border flex items-center justify-between">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">From</p>
                <p className="font-bold">{result.from}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <p className="font-bold">{result.to}</p>
              </div>
              <div className="text-right border-l pl-4">
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="font-bold text-xl text-primary">{result.amount} VAP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
