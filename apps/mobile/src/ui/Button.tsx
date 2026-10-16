import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./Text";
import { NAVY, gradients, useTheme } from "./theme";

type Props = Omit<PressableProps, "children"> & {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "dark" | "light" | "outlineLight";
  loading?: boolean;
  size?: "md" | "sm";
  icon?: React.ReactNode;
};

/** 48pt tall by default: Apple and Google both set 44–48 as the minimum comfortable touch target. */
export function Button({ title, variant = "primary", loading, disabled, size = "md", icon, style, ...rest }: Props) {
  const t = useTheme();
  const isDisabled = disabled || loading;
  const bg =
    variant === "danger" ? t.danger : variant === "secondary" ? t.surface : variant === "dark" ? NAVY : variant === "light" ? "#FFFFFF" : "transparent";
  const fg =
    variant === "primary" || variant === "outlineLight" ? "#FFFFFF" : variant === "danger" || variant === "dark" ? "#FFFFFF"
    : variant === "secondary" ? t.text : variant === "light" ? "#0F766E" : t.primarySoftText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={(s) => [
        {
          minHeight: size === "sm" ? 40 : 50,
          paddingHorizontal: size === "sm" ? 16 : 20,
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: bg,
          borderWidth: variant === "secondary" || variant === "outlineLight" ? 1 : 0,
          borderColor: variant === "outlineLight" ? "rgba(255,255,255,0.35)" : t.border,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: isDisabled ? 0.55 : s.pressed ? 0.85 : 1,
        },
        typeof style === "function" ? style(s) : style,
      ]}
      {...rest}
    >
      {variant === "primary" && (
        <LinearGradient colors={gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      )}
      {loading ? <ActivityIndicator color={fg} /> : <>{icon ? <View>{icon}</View> : null}<Text variant="subheading" style={{ color: fg }}>{title}</Text></>}
    </Pressable>
  );
}
