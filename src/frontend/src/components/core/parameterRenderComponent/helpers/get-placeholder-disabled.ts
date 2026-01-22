import {
  DEFAULT_PLACEHOLDER,
  RECEIVING_INPUT_VALUE,
} from "@/constants/constants";

export const getPlaceholder = (
  disabled: boolean,
  returnMessage: string = DEFAULT_PLACEHOLDER,
) => {
  if (disabled) return RECEIVING_INPUT_VALUE; // Will be replaced with i18n

  return returnMessage || DEFAULT_PLACEHOLDER; // Will be replaced with i18n
};
