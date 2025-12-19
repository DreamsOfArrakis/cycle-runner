export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer 
      className="mt-auto border-t py-4"
      style={{
        backgroundColor: '#F7FCFC',
        borderColor: '#0e545e33',
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-2">
          {/* Logo and Tagline */}
          <div className="flex items-center gap-1.5">
            <span 
              className="text-sm font-bold tracking-tight opacity-70"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                letterSpacing: '-0.02em',
                color: '#0e545e'
              }}
            >
              CYCLE-RUNNER
            </span>
          </div>

          {/* Contact Link */}
          {/* <a
            href="mailto:contact@cyclerunner.com"
            className="text-xs text-black opacity-60 hover:opacity-80 transition"
          >
            Need help? Contact me
          </a> */}
        </div>
      </div>
    </footer>
  );
}

