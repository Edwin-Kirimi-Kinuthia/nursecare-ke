import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useContacts } from "@/lib/appConfig";
import { callNumber } from "@/lib/links";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";

/**
 * Deliberately a phone screen, not a request form. The website's in-app request
 * is handed to ambulance operators, and none are onboarded yet — so a form here
 * would let someone in an emergency type their location into something nobody
 * is reading. A phone call always reaches a person.
 */
export default function AmbulanceScreen() {
  const { ambulancePhone, nationalEmergencyNumbers } = useContacts();
  return (
    <Screen>
      <Banner tone="danger">If someone is unconscious, struggling to breathe, bleeding heavily or having chest pain, call now. Don&apos;t book a consultation.</Banner>
      <Button variant="danger" title={`Call ${ambulancePhone}`} icon={<Ionicons name="call" size={18} color="#fff" />} onPress={() => callNumber(ambulancePhone)} />
      <Card>
        <Text variant="subheading">When you call, say</Text>
        <Step n={1} text="Where you are: the area, the nearest landmark or building, and the road if you can." />
        <Step n={2} text="What has happened, how many people are hurt or ill, and whether they are conscious and breathing." />
        <Step n={3} text="A phone number we can reach you on. Then keep your phone free." />
      </Card>
      <Card>
        <Text variant="subheading">If no one answers</Text>
        <Text tone="muted">Don&apos;t wait. Call Kenya&apos;s national emergency numbers or get to the nearest hospital.</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          {nationalEmergencyNumbers.map((n) => <View key={n} style={{ flex: 1 }}><Button title={`Call ${n}`} variant="secondary" size="sm" onPress={() => callNumber(n)} /></View>)}
        </View>
      </Card>
      <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>We can&apos;t promise an arrival time. It depends on where you are and which crew is free.</Text>
    </Screen>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Text style={{ fontWeight: "800", width: 18 }}>{n}.</Text>
      <Text style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}
