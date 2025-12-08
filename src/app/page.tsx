import Index from "@/components/Dashboard";
import DefaultLayout from "@/components/Layout/DefaultLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protein Bind: a leading research platform for drug discovery",
  description: "this is a description",
};

export default function Home() {
  return (
    <>
      <DefaultLayout>
        <Index />
      </DefaultLayout>
    </>
  );
}
