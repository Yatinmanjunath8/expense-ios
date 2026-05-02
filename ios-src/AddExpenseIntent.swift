import AppIntents
import UIKit

@available(iOS 16.0, *)
struct AddExpenseIntent: AppIntent {
    static var title: LocalizedStringResource = "Process Receipt"
    static var description = IntentDescription("Takes a screenshot or image and opens Expense Tracker to automatically log the transaction.")
    static var openAppWhenRun: Bool = true
    
    @Parameter(title: "Receipt Image", supportedTypeIdentifiers: ["public.image"])
    var image: IntentFile?

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let image = image else { return .result() }
        
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".jpg")
        
        // Write the incoming image data to a temporary file accessible by the main app
        try? image.data.write(to: tempURL)
        
        // Use our deep link scheme to pass the file path to React Native
        let scheme = "expensetracker"
        let encodedPath = tempURL.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        
        if let url = URL(string: "\(scheme)://add?image=\(encodedPath)") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
        
        return .result()
    }
}

@available(iOS 16.0, *)
struct ExpenseTrackerShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddExpenseIntent(),
            phrases: [
                "Process a receipt in \(.applicationName)",
                "Add an expense in \(.applicationName)",
                "Scan payment in \(.applicationName)"
            ],
            shortTitle: "Add Expense",
            systemImageName: "indianrupeesign.circle"
        )
    }
}
