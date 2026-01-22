import { useTranslation } from "react-i18next";
import { convertTestName } from "@/components/common/storeCardComponent/utils/convert-test-name";
import { Badge } from "@/components/ui/badge";
import { nodeColorsName } from "@/utils/styleUtils";

export default function HandleTooltipComponent({
  isInput,
  tooltipTitle,
  isConnecting,
  isCompatible,
  isSameNode,
  left,
}: {
  isInput: boolean;
  tooltipTitle: string;
  isConnecting: boolean;
  isCompatible: boolean;
  isSameNode: boolean;
  left: boolean;
}) {
  const { t } = useTranslation();
  const tooltips = tooltipTitle.split("\n");
  const plural = tooltips.length > 1 ? "s" : "";

  return (
    <div className="font-medium">
      {isSameNode ? (
        t('customNodes.cantConnectToSameNode')
      ) : (
        <div className="flex items-center gap-1.5">
          {isConnecting ? (
            isCompatible ? (
              <span>
                <span className="font-semibold">{t('customNodes.connect')}</span> to
              </span>
            ) : (
              <span>{t('customNodes.incompatibleWith')}</span>
            )
          ) : (
            <span className="text-xs">
              {isInput
                ? `${t('customNodes.inputTypes')}${plural}`
                : `${t('customNodes.outputTypes')}${plural}`}
              :{" "}
            </span>
          )}
          {tooltips.map((word, index) => (
            <Badge
              className="h-6 rounded-md p-1"
              key={`${index}-${word.toLowerCase()}`}
              style={{
                backgroundColor: left
                  ? `hsl(var(--datatype-${nodeColorsName[word]}))`
                  : `hsl(var(--datatype-${nodeColorsName[word]}-foreground))`,
                color: left
                  ? `hsl(var(--datatype-${nodeColorsName[word]}-foreground))`
                  : `hsl(var(--datatype-${nodeColorsName[word]}))`,
              }}
              data-testid={`${isInput ? "input" : "output"}-tooltip-${convertTestName(word)}`}
            >
              {word}
            </Badge>
          ))}
          {isConnecting && <span>{isInput ? t('customNodes.input') : t('customNodes.output')}</span>}
        </div>
      )}
      {!isConnecting && (
        <div className="mt-2 flex flex-col gap-0.5 text-xs leading-6">
          <div>
            <b>Drag</b> to connect compatible {!isInput ? "inputs" : "outputs"}
          </div>
          <div>
            <b>Click</b> to filter compatible {!isInput ? "inputs" : "outputs"}{" "}
            and components
          </div>
        </div>
      )}
    </div>
  );
}
