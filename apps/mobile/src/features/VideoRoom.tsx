import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Track } from "livekit-client";
import {
  AudioSession, LiveKitRoom, VideoTrack, isTrackReference, registerGlobals,
  useConnectionState, useLocalParticipant, useRoomContext, useTracks,
} from "@livekit/react-native";
import { Text } from "@/ui/Text";

// Installs the WebRTC globals LiveKit needs. Must run once, before any room is
// created; it is here (not in the app root) so that the native video module is
// only touched on the one screen that uses it.
registerGlobals();

type Props = {
  serverUrl: string;
  token: string;
  otherName: string;
  /** Show the doctor's extra "End consultation" control. */
  canEnd: boolean;
  chatOpen: boolean;
  unread: number;
  onToggleChat: () => void;
  onLeave: () => void;
  onEnd: () => void;
  children?: React.ReactNode;
};

/**
 * A two-person video call. The remote person fills the screen and you are the
 * small picture-in-picture. The chat panel (children) sits over the lower half.
 */
export function VideoRoom({ serverUrl, token, otherName, canEnd, chatOpen, unread, onToggleChat, onLeave, onEnd, children }: Props) {
  // The audio session has to be running before the room connects, and released
  // on the way out or the phone keeps routing audio as if a call were live.
  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => { void AudioSession.stopAudioSession(); };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio
      video
      options={{ adaptiveStream: { pixelDensity: "screen" } }}
      onDisconnected={onLeave}
    >
      <Stage otherName={otherName} canEnd={canEnd} chatOpen={chatOpen} unread={unread} onToggleChat={onToggleChat} onLeave={onLeave} onEnd={onEnd}>
        {children}
      </Stage>
    </LiveKitRoom>
  );
}

function Stage({ otherName, canEnd, chatOpen, unread, onToggleChat, onLeave, onEnd, children }: Omit<Props, "serverUrl" | "token">) {
  const room = useRoomContext();
  const state = useConnectionState();
  const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera]);

  const remote = tracks.find((t) => !t.participant.isLocal && isTrackReference(t));
  const local = tracks.find((t) => t.participant.isLocal && isTrackReference(t));

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1215" }}>
      {/* remote video, or a waiting state */}
      <View style={{ flex: chatOpen ? 0.4 : 1, alignItems: "center", justifyContent: "center" }}>
        {remote && isTrackReference(remote) ? (
          <VideoTrack trackRef={remote} style={{ flex: 1, alignSelf: "stretch" }} objectFit="cover" />
        ) : (
          <View style={{ alignItems: "center", gap: 10, padding: 24 }}>
            <Ionicons name={state === "connected" ? "hourglass-outline" : "wifi-outline"} size={40} color="#94A3B8" />
            <Text style={{ color: "#E2E8F0", textAlign: "center", fontWeight: "700" }}>
              {state === "connected" ? `Waiting for ${otherName} to join…` : state === "reconnecting" ? "Reconnecting…" : "Connecting…"}
            </Text>
            {state === "connected" && <Text variant="caption" style={{ color: "#94A3B8", textAlign: "center" }}>Stay on this screen. The video starts as soon as they join.</Text>}
          </View>
        )}

        {local && isTrackReference(local) && isCameraEnabled && (
          <View style={{ position: "absolute", right: 12, top: 12, width: 96, height: 132, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.7)" }}>
            <VideoTrack trackRef={local} style={{ flex: 1 }} objectFit="cover" mirror />
          </View>
        )}
      </View>

      {chatOpen && <View style={{ flex: 0.6 }}>{children}</View>}

      {/* controls */}
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: "#0B1215" }}>
        <Control icon={isMicrophoneEnabled ? "mic" : "mic-off"} label={isMicrophoneEnabled ? "Mute" : "Unmute"} off={!isMicrophoneEnabled}
          onPress={() => void room.localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)} />
        <Control icon={isCameraEnabled ? "videocam" : "videocam-off"} label={isCameraEnabled ? "Stop video" : "Start video"} off={!isCameraEnabled}
          onPress={() => void room.localParticipant.setCameraEnabled(!isCameraEnabled)} />
        <Control icon={chatOpen ? "chatbubble" : "chatbubble-outline"} label="Chat" badge={chatOpen ? 0 : unread} onPress={onToggleChat} />
        <Control icon="call" label="Leave" danger onPress={onLeave} />
        {canEnd && <Control icon="checkmark-done" label="End" danger onPress={onEnd} />}
      </View>
    </View>
  );
}

function Control({ icon, label, onPress, off, danger, badge }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; off?: boolean; danger?: boolean; badge?: number;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ alignItems: "center", gap: 4 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: danger ? "#E11D48" : off ? "#FFFFFF" : "rgba(255,255,255,0.16)" }}>
        <Ionicons name={icon} size={24} color={off ? "#0B1215" : "#FFFFFF"} />
        {badge ? (
          <View style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
            <Text variant="caption" style={{ color: "#0B1215", fontWeight: "800", fontSize: 11 }}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" style={{ color: "#CBD5E1" }}>{label}</Text>
    </Pressable>
  );
}
