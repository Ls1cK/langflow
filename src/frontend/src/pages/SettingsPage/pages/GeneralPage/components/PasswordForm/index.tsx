import * as Form from "@radix-ui/react-form";
import { useTranslation } from "react-i18next";
import InputComponent from "../../../../../../components/core/parameterRenderComponent/components/inputComponent";
import { Button } from "../../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../../../../components/ui/card";

type PasswordFormComponentProps = {
  password: string;
  cnfPassword: string;
  handleInput: (event: any) => void;
  handlePatchPassword: (
    password: string,
    cnfPassword: string,
    handleInput: any,
  ) => void;
};
const PasswordFormComponent = ({
  password,
  cnfPassword,
  handleInput,
  handlePatchPassword,
}: PasswordFormComponentProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Form.Root
        onSubmit={(event) => {
          handlePatchPassword(password, cnfPassword, handleInput);
          event.preventDefault();
        }}
      >
        <Card x-chunk="dashboard-04-chunk-2">
          <CardHeader>
            <CardTitle>{t('pages.password.title')}</CardTitle>
            <CardDescription>
              {t('pages.password.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full gap-4">
              <Form.Field name="password" className="w-full">
                <InputComponent
                  id="pasword"
                  onChange={(value) => {
                    handleInput({ target: { name: "password", value } });
                  }}
                  value={password}
                  isForm
                  password={true}
                  placeholder={t('pages.password.password')}
                  className="w-full"
                />
                <Form.Message match="valueMissing" className="field-invalid">
                  {t('pages.password.enterPassword')}
                </Form.Message>
              </Form.Field>
              <Form.Field name="cnfPassword" className="w-full">
                <InputComponent
                  id="cnfPassword"
                  onChange={(value) => {
                    handleInput({
                      target: { name: "cnfPassword", value },
                    });
                  }}
                  value={cnfPassword}
                  isForm
                  password={true}
                  placeholder={t('pages.password.confirmPassword')}
                  className="w-full"
                />

                <Form.Message className="field-invalid" match="valueMissing">
                  {t('pages.password.confirmPasswordMessage')}
                </Form.Message>
              </Form.Field>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Form.Submit asChild>
              <Button type="submit">{t('pages.password.save')}</Button>
            </Form.Submit>
          </CardFooter>
        </Card>
      </Form.Root>
    </>
  );
};
export default PasswordFormComponent;
