import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface TagPillProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

export const TagPill: React.FC<TagPillProps> = ({ label, selected = false, onPress, onRemove }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !onRemove}
      style={[
        styles.container,
        {
          backgroundColor: selected ? colors.blue : colors.surfaceAlt,
          borderColor: selected ? colors.blue : colors.border,
        }
      ]}
    >
      <Text style={[styles.text, { color: selected ? '#FFF' : colors.text }]}>
        {label}
      </Text>
      {onRemove && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={{ color: selected ? '#FFF' : colors.textSecondary, fontSize: 12 }}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  removeBtn: {
    marginLeft: 6,
  }
});
