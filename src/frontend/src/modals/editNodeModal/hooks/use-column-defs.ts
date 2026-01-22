import type { ColDef, ValueGetterParams } from "ag-grid-community";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import TableAdvancedToggleCellRender from "@/components/core/parameterRenderComponent/components/tableComponent/components/tableAdvancedToggleCellRender";
import TableNodeCellRender from "@/components/core/parameterRenderComponent/components/tableComponent/components/tableNodeCellRender";

const useColumnDefs = (
  nodeId: string,
  open: boolean,
  isTweaks?: boolean,
  hideVisibility?: boolean,
) => {
  const { t } = useTranslation();
  const columnDefs: ColDef[] = useMemo(() => {
    const colDefs: ColDef[] = [
      {
        headerName: t('modals.editNode.fieldName'),
        field: "display_name",
        valueGetter: (params) => {
          const templateParam = params.data;
          return (
            (templateParam.display_name
              ? templateParam.display_name
              : templateParam.name) ?? params.data.key
          );
        },
        wrapText: true,
        autoHeight: true,
        flex: 1,
        resizable: false,
        cellClass: "no-border cursor-default text-muted-foreground !py-1",
      },
      {
        headerName: t('common.description'),
        field: "info",
        tooltipField: "info",
        wrapText: true,
        autoHeight: true,
        flex: 2,
        resizable: false,
        cellClass: "no-border cursor-default text-muted-foreground !py-1",
      },
      {
        headerName: isTweaks ? t('modals.editNode.currentValue') : t('modals.editNode.value'),
        field: "value",
        cellRenderer: TableNodeCellRender,
        cellStyle: {
          display: "flex",
          "justify-content": "flex-start",
          "align-items": "flex-start",
        },
        valueGetter: (params: ValueGetterParams) => {
          return {
            nodeId: nodeId,
            parameterId: params.data.key,
            isTweaks,
          };
        },
        suppressKeyboardEvent: (params) =>
          params.event.key === "a" &&
          (params.event.ctrlKey || params.event.metaKey),
        minWidth: 340,
        autoHeight: true,
        flex: 1,
        resizable: false,
        cellClass: "no-border cursor-default !py-1",
      },
    ];
    if (!hideVisibility) {
      colDefs.unshift({
        headerName: isTweaks ? "Expose Input" : "Show",
        field: "advanced",
        cellRenderer: TableAdvancedToggleCellRender,
        valueGetter: (params: ValueGetterParams) => {
          return {
            nodeId,
            parameterId: params.data.key,
            isTweaks,
          };
        },
        editable: false,
        maxWidth: !isTweaks ? 80 : 120,
        minWidth: !isTweaks ? 80 : 120,
        resizable: false,
        cellClass: "no-border cursor-default !py-1",
      });
    }
    return colDefs;
  }, [open]);

  return columnDefs;
};

export default useColumnDefs;
