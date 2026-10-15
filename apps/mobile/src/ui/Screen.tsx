import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, useTheme } from "./theme";

type Props = ScrollViewProps & {
  children: React.ReactNode;
  /** Pull-to-refresh. */
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  /** Pad under the status bar. Off when a navigator header already does it. */
  padTop?: boolean;
  gap?: number;
};

/** Scrolling page with safe-area padding, keyboard avoidance and optional pull-to-refresh. */
export function Screen({ children, onRefresh, refreshing, padTop = false, gap = space.lg, contentContainerStyle, ...rest }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.primary} /> : undefined}
        contentContainerStyle={[
          { padding: space.lg, gap, paddingTop: space.lg + (padTop ? insets.top : 0), paddingBottom: space.xxl + insets.bottom },
          contentContainerStyle,
        ]}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A flat container with the standard surface and border. */
export function Card({ children, style, ...rest }: React.ComponentProps<typeof View>) {
  const t = useTheme();
  return (
    <View
      style={[{ backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: space.lg, gap: space.sm }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
