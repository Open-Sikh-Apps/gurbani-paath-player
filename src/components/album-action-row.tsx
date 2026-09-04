import { Alert, Modal } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { useChrome } from "@/hooks/use-chrome";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, Text, View, cn, ui } from "@/tw";

type ActionItem = {
  key: string;
  icon: AppIconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type AlbumActionRowProps = {
  items: ActionItem[];
};

export function AlbumActionRow({ items }: AlbumActionRowProps) {
  const { hit, text, tabIcon } = useChrome();
  const colors = useThemeColors();

  return (
    <View className="flex-row gap-2">
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ disabled: item.disabled }}
          className={cn(
            "min-w-0 flex-1 items-center justify-center overflow-visible rounded-2xl border px-2 py-3",
            ui.border,
            ui.surface,
            hit,
            item.disabled && "opacity-40",
          )}
          disabled={item.disabled}
          onPress={item.onPress}
        >
          <AppIcon name={item.icon} size={tabIcon} color={colors.accent} />
          <Text
            className={cn("mt-1 px-0.5 text-center", ui.text, text)}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export type DownloadSheetOptions = {
  title: string;
  downloadAll: string | null;
  select: string | null;
  removeAll: string | null;
  cancel: string;
  onDownloadAll: () => void;
  onSelect: () => void;
  onRemoveAll: () => void;
};

export function DownloadOptionsSheet({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: DownloadSheetOptions | null;
  onClose: () => void;
}) {
  const { hit, text } = useChrome();

  if (!options) {
    return null;
  }

  const actions: { key: string; label: string; destructive?: boolean; run: () => void }[] =
    [];
  if (options.downloadAll) {
    actions.push({
      key: "all",
      label: options.downloadAll,
      run: options.onDownloadAll,
    });
  }
  if (options.select) {
    actions.push({
      key: "select",
      label: options.select,
      run: options.onSelect,
    });
  }
  if (options.removeAll) {
    actions.push({
      key: "remove",
      label: options.removeAll,
      destructive: true,
      run: options.onRemoveAll,
    });
  }

  // RN Modal is a separate window; without these, Android drops edge-to-edge on open.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={options.cancel}
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
        />
        <View className={cn("overflow-visible rounded-t-3xl border-t px-4 pb-8 pt-4", ui.border, ui.surface)}>
          <Text className={cn("mb-3 px-2 text-center font-bold", ui.text, text)}>
            {options.title}
          </Text>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              className={cn(
                "items-center justify-center overflow-visible rounded-2xl px-3 py-3.5",
                hit,
              )}
              onPress={() => {
                // Dismiss the sheet before the next Alert so two modals do not stack.
                onClose();
                action.run();
              }}
            >
              <Text
                className={cn(
                  "px-2 text-center",
                  action.destructive ? ui.accent : ui.text,
                  text,
                )}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={options.cancel}
            className={cn(
              "items-center justify-center overflow-visible rounded-2xl px-3 py-3.5",
              hit,
            )}
            onPress={onClose}
          >
            <Text className={cn("px-2 text-center", ui.muted, text)}>
              {options.cancel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function confirmRemove(options: {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
}): void {
  Alert.alert(options.title, options.body, [
    { text: options.cancel, style: "cancel" },
    {
      text: options.confirm,
      style: "destructive",
      onPress: options.onConfirm,
    },
  ]);
}
