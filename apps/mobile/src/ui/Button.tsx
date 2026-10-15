import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";
import { Text } from "./Text";
import { radius, useTheme } from "./theme";

type Props = Omit<PressableProps, "children"> & {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  size?: "md" | "sm";
  icon?: React.ReactNode;
};

/** 48pt tall by default: Apple and Google both set 44–48 as the minimum comfortable touch target. */
export function Button({ title, variant = "primary", loading, disabled, size = "md", icon, style, ...rest }: Props) {
  const t = useTheme();
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary" ? t.primary : variant === "danger" ? t.danger : variant === "secondary" ? t.surface : "transparent";
  const fg =
    variant === "primary" ? t.onPrimary : variant === "danger" ? "#FFFFFF" : variant === "secondary" ? t.text : t.primarySoftText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={(s) => [
        {
          minHeight: size === "sm" ? 40 : 50,
          paddingHorizontal: size === "sm" ? 16 : 20,
          borderRadius: radius.md,
          backgroundColor: bg,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: t.border,
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
      {loading ? <ActivityIndicator color={fg} /> : <>{icon ? <View>{icon}</View> : null}<Text variant="subheading" style={{ color: fg }}>{title}</Text></>}
    </Pressable>
  );
}
