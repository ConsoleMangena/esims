import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="ESIMS - Register"
        description="Create a new ESIMS account."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
