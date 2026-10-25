
import "./globals.css";

export const metadata = {
  title: "HCM Lite | People workspace",
  description: "Human Capital Management for Admin, HR and Employees.",
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body  cz-shortcut-listen="true">{children}</body>
    </html>
  );
}
export default RootLayout;
