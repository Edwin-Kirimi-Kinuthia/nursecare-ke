import { View } from "react-native";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
export function OrderPagination({ page, total, onChange, size = 50 }: { page:number; total:number; onChange:(page:number)=>void; size?:number }) {
  if (!total) return null;
  return <View style={{gap:8}}><Text variant="caption" tone="muted">{page*size+1}–{Math.min((page+1)*size,total)} of {total} orders</Text><View style={{flexDirection:"row",gap:8}}><Button title="Previous orders" variant="secondary" size="sm" disabled={page===0} onPress={()=>onChange(page-1)} /><Button title="Older orders" variant="secondary" size="sm" disabled={(page+1)*size>=total} onPress={()=>onChange(page+1)} /></View></View>;
}
