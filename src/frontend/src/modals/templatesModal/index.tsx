import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ForwardedIconComponent from "@/components/common/genericIconComponent";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useCustomNavigate } from "@/customization/hooks/use-custom-navigate";
import { track } from "@/customization/utils/analytics";
import useAddFlow from "@/hooks/flows/use-add-flow";
import type { Category } from "@/types/templates/types";
import type { newFlowModalPropsType } from "../../types/components";
import BaseModal from "../baseModal";
import GetStartedComponent from "./components/GetStartedComponent";
import { Nav } from "./components/navComponent";
import TemplateContentComponent from "./components/TemplateContentComponent";

export default function TemplatesModal({
  open,
  setOpen,
}: newFlowModalPropsType): JSX.Element {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState("get-started");
  const addFlow = useAddFlow();
  const navigate = useCustomNavigate();
  const { folderId } = useParams();

  // Define categories and their items
  const categories: Category[] = [
    {
      title: t('modal:templates.categories.templates'),
      items: [
        { title: t('modal:templates.categories.getStarted'), icon: "SquarePlay", id: "get-started" },
        { title: t('modal:templates.categories.allTemplates'), icon: "LayoutPanelTop", id: "all-templates" },
      ],
    },
    {
      title: t('modal:templates.categories.useCases'),
      items: [
        { title: t('modal:templates.categories.assistants'), icon: "BotMessageSquare", id: "assistants" },
        { title: t('modal:templates.categories.classification'), icon: "Tags", id: "classification" },
        { title: t('modal:templates.categories.coding'), icon: "TerminalIcon", id: "coding" },
        {
          title: t('modal:templates.categories.contentGeneration'),
          icon: "Newspaper",
          id: "content-generation",
        },
        { title: t('modal:templates.categories.qa'), icon: "Database", id: "q-a" },
        // { title: "Summarization", icon: "Bot", id: "summarization" },
        // { title: "Web Scraping", icon: "CodeXml", id: "web-scraping" },
      ],
    },
    {
      title: t('modal:templates.categories.methodology'),
      items: [
        { title: t('modal:templates.categories.prompting'), icon: "MessagesSquare", id: "chatbots" },
        { title: t('modal:templates.categories.rag'), icon: "Database", id: "rag" },
        { title: t('modal:templates.categories.agents'), icon: "Bot", id: "agents" },
      ],
    },
  ];

  return (
    <BaseModal size="templates" open={open} setOpen={setOpen} className="p-0">
      <BaseModal.Content className="flex flex-col p-0">
        <div className="flex h-full">
          <SidebarProvider width="15rem" defaultOpen={false}>
            <Nav
              categories={categories}
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
            />
            <main className="flex flex-1 flex-col gap-4 overflow-auto p-6 md:gap-8">
              {currentTab === "get-started" ? (
                <GetStartedComponent />
              ) : (
                <TemplateContentComponent
                  currentTab={currentTab}
                  categories={categories.flatMap((category) => category.items)}
                />
              )}
              <BaseModal.Footer>
                <div className="flex w-full flex-col justify-between gap-4 pb-4 sm:flex-row sm:items-center">
                  <div className="flex flex-col items-start justify-center">
                    <div className="font-semibold">{t('modal:templates.startFromScratch')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('modal:templates.startFromScratchDescription')}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      addFlow().then((id) => {
                        navigate(
                          `/flow/${id}${folderId ? `/folder/${folderId}` : ""}`,
                        );
                      });
                      track("New Flow Created", { template: "Blank Flow" });
                    }}
                    size="sm"
                    data-testid="blank-flow"
                    className="shrink-0"
                  >
                    <ForwardedIconComponent
                      name="Plus"
                      className="h-4 w-4 shrink-0"
                    />
                    {t('modal:templates.blankFlow')}
                  </Button>
                </div>
              </BaseModal.Footer>
            </main>
          </SidebarProvider>
        </div>
      </BaseModal.Content>
    </BaseModal>
  );
}
