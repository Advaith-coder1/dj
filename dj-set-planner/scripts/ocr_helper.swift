import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count > 1 else {
    print("[]")
    exit(0)
}

let imagePath = CommandLine.arguments[1]
guard let nsImage = NSImage(contentsOfFile: imagePath),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("[]")
    exit(0)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
    let observations = request.results ?? []
    var lines: [String] = []
    for obs in observations {
        if let top = obs.topCandidates(1).first {
            lines.append(top.string)
        }
    }
    let data = try JSONSerialization.data(withJSONObject: lines, options: [])
    if let jsonStr = String(data: data, encoding: .utf8) {
        print(jsonStr)
    } else {
        print("[]")
    }
} catch {
    print("[]")
}
