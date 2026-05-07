import ExpoModulesCore
import Vision
import UIKit

public class ExpoVisionOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoVisionOcr")

    AsyncFunction("recognizeImage") { (url: String, promise: Promise) in
      guard let imageURL = URL(string: url),
            let data = try? Data(contentsOf: imageURL),
            let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        promise.reject(Exception(name: "ImageLoadError", description: "Could not load image from URL"))
        return
      }

      let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      let request = VNRecognizeTextRequest { (request, error) in
        if let error = error {
          promise.reject(Exception(name: "VisionError", description: error.localizedDescription))
          return
        }

        guard let observations = request.results as? [VNRecognizedTextObservation] else {
          promise.resolve([])
          return
        }

        var blocks: [[String: Any]] = []

        for observation in observations {
          guard let topCandidate = observation.topCandidates(1).first else { continue }
          
          let boundingBox = observation.boundingBox
          let size = image.size
          
          // Vision coordinates are normalized (0 to 1) with origin at bottom-left
          let x = boundingBox.minX * size.width
          let y = (1 - boundingBox.maxY) * size.height
          let width = boundingBox.width * size.width
          let height = boundingBox.height * size.height
          
          blocks.append([
            "text": topCandidate.string,
            "frame": [
              "x": x,
              "y": y,
              "width": width,
              "height": height
            ]
          ])
        }

        promise.resolve(blocks)
      }

      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true

      do {
        try requestHandler.perform([request])
      } catch {
        promise.reject(Exception(name: "VisionPerformError", description: error.localizedDescription))
      }
    }
  }
}
