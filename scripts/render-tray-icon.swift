import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let size = 24
let designSize: CGFloat = 36
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGBitmapInfo.byteOrder32Big.union(CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue))
guard let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
                             bytesPerRow: size * 4, space: colorSpace, bitmapInfo: bitmapInfo.rawValue) else {
    fatalError("Could not create the tray icon bitmap.")
}

context.clear(CGRect(x: 0, y: 0, width: size, height: size))
context.scaleBy(x: CGFloat(size) / designSize, y: CGFloat(size) / designSize)
let bubble = CGPath(roundedRect: CGRect(x: 6, y: 10, width: 24, height: 20), cornerWidth: 3.5, cornerHeight: 3.5, transform: nil)
context.addPath(bubble)
context.move(to: CGPoint(x: 14, y: 10))
context.addLine(to: CGPoint(x: 10, y: 5))
context.addLine(to: CGPoint(x: 10, y: 10))
context.closePath()
context.setFillColor(CGColor(gray: 0, alpha: 1))
context.fillPath()

// A transparent check keeps the menu bar image readable as a macOS template icon.
context.setBlendMode(CGBlendMode.clear)
context.setStrokeColor(CGColor(gray: 1, alpha: 1))
context.setLineWidth(2.5)
context.setLineCap(CGLineCap.round)
context.setLineJoin(CGLineJoin.round)
context.move(to: CGPoint(x: 11.5, y: 20))
context.addLine(to: CGPoint(x: 15.5, y: 16.5))
context.addLine(to: CGPoint(x: 19, y: 19.5))
context.addLine(to: CGPoint(x: 25, y: 14))
context.strokePath()

guard let image = context.makeImage() else { fatalError("Could not render the tray icon.") }
let output = CommandLine.arguments.dropFirst().first ?? "electron/tray-mark.png"
let outputURL = URL(fileURLWithPath: output)
guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    fatalError("Could not create the tray PNG.")
}
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("Could not write the tray PNG.") }
