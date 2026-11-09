import Cocoa
import WebKit

class FloatingHUDPanel: NSPanel {
    override var canBecomeKey: Bool {
        return true
    }
    override var canBecomeMain: Bool {
        return true
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var panel: FloatingHUDPanel!
    var webView: WKWebView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let urlString = CommandLine.arguments.count > 1
            ? CommandLine.arguments[1]
            : "http://localhost:3000/?perf=1&hud=1"

        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let width: CGFloat = 390
        let height: CGFloat = 520
        let x = screenRect.maxX - width - 20
        let y = screenRect.maxY - height - 20

        let contentRect = NSRect(x: x, y: y, width: width, height: height)

        // .nonactivatingPanel + .accessory policy allows floating over Full-Screen macOS Spaces (like Rekordbox Full Screen)
        panel = FloatingHUDPanel(
            contentRect: contentRect,
            styleMask: [.titled, .closable, .resizable, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        panel.title = "DJ Architect — Rekordbox HUD (Always on Top)"
        panel.appearance = NSAppearance(named: .darkAqua)
        panel.backgroundColor = NSColor(red: 0.086, green: 0.086, blue: 0.086, alpha: 1.0)
        panel.isFloatingPanel = true
        panel.hidesOnDeactivate = false

        // Float above full-screen apps & join all macOS Spaces (including Full-Screen Rekordbox)
        panel.level = .statusBar
        panel.collectionBehavior = [
            .canJoinAllSpaces,
            .fullScreenAuxiliary,
            .stationary
        ]
        panel.delegate = self

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: panel.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground")

        panel.contentView?.addSubview(webView)

        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }

        panel.makeKeyAndOrderFront(nil)
        panel.orderFrontRegardless()
    }

    func windowWillClose(_ notification: Notification) {
        NSApplication.shared.terminate(nil)
    }
}

let app = NSApplication.shared
// .accessory policy is essential on macOS so the panel can overlay Full-Screen apps without switching Spaces
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
