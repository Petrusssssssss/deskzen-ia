import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-4 bg-background">
      <h2 className="text-4xl font-headline font-bold text-primary">404</h2>
      <p className="text-muted-foreground font-medium">Ops! Esta página sumiu na desordem.</p>
      <Button asChild variant="default" className="font-bold">
        <Link href="/">VOLTAR PARA A ORDEM</Link>
      </Button>
    </div>
  )
}