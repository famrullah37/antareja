import Footer from "../components/global/Footer";
import Navbar from "../components/global/Navbar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="mt-[64px] lg:mt-[76px] overflow-hidden">
        {children}
        <Footer />
      </main>
    </>
  );
}
