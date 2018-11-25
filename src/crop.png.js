/* eslint-disable */
export function removeImageBlanks (imageObject, _options = {}) {
  let options = Object.assign({
    paddingScale: 0,
    square: false, // 默认正方形 1:1,
    padding: 0,
    quality: 1, // 0 ~ 1 对jpg 有效 (质量压缩)
    dataType: 'base64', // [base64/blob] 返回数据类型
    type: 'png',  // [png/jpg/webp] 默认 png
    fillColor: '' // 填充背景色 (默认透明)

  }, _options)
  if (typeof imageObject === 'undefined') {
    console.error(`请输入images对象!`)
    return
    // 如果是数组,代表是合并并裁剪
  }
  return new Promise((resolve, reject) => {
    let imgWidth = imageObject.width
    let imgHeight = imageObject.height
    let canvas = document.createElement("canvas")
    canvas.setAttribute("width", imgWidth)
    canvas.setAttribute("height", imgHeight)
    let context = canvas.getContext("2d")
    context.drawImage(imageObject, 0, 0)

    let imageData = context.getImageData(0, 0, imgWidth, imgHeight),
      data = imageData.data,
      getRBG = function (x, y) {
        var offset = imgWidth * y + x
        return {
          red: data[offset * 4],
          green: data[offset * 4 + 1],
          blue: data[offset * 4 + 2],
          opacity: data[offset * 4 + 3]
        }
      },
      isWhite = function (rgb) {
        // console.log('rgb--',rgb)
        // many images contain noise, as the white is not a pure #fff white
        return rgb.red > 200 && rgb.green > 200 && rgb.blue > 200
      },
      isTransparent = function (rgba) {
        return rgba.opacity === 0
      },
      scanY = function (fromTop) {
        var offset = fromTop ? 1 : -1

        // loop through each row
        for (
          var y = fromTop ? 0 : imgHeight - 1;
          fromTop ? y < imgHeight : y > -1;
          y += offset
        ) {
          // loop through each column
          for (var x = 0; x < imgWidth; x++) {
            var rgb = getRBG(x, y);
            if (!isWhite(rgb) && !isTransparent(rgb)) {
              if (fromTop) {
                return y;
              } else {
                return Math.min(y + 1, imgHeight - 1)
              }
            }
          }
        }
        return null // all image is white
      },
      scanX = function (fromLeft) {
        var offset = fromLeft ? 1 : -1

        // loop through each column
        for (
          var x = fromLeft ? 0 : imgWidth - 1;
          fromLeft ? x < imgWidth : x > -1;
          x += offset
        ) {
          // loop through each row
          for (var y = 0; y < imgHeight; y++) {
            var rgb = getRBG(x, y);
            if (!isWhite(rgb) && !isTransparent(rgb)) {
              if (fromLeft) {
                return x;
              } else {
                return Math.min(x + 1, imgWidth - 1)
              }
            }
          }
        }
        return null // all image is white
      }

    let cropTop = scanY(true),
      cropBottom = scanY(false),
      cropLeft = scanX(true),
      cropRight = scanX(false),
      cropWidth = cropRight - cropLeft,
      cropHeight = cropBottom - cropTop

    console.table({
      before: '裁剪坐标计算',
      cropTop: cropTop,
      cropBottom: cropBottom,
      cropLeft: cropLeft,
      cropRight: cropRight,
      cropWidth: cropWidth,
      cropHeight: cropHeight
    })

    // finally crop the guy
    let size = 1
    console.warn('## options ##', options)
    if (options.paddingScale !== 1 || options.padding > 0) {

      let whoMax = cropHeight > cropWidth ? 'H' : 'W'
      let Max = Math.max(cropHeight, cropWidth),
        Min = Math.min(cropHeight, cropWidth)
      let sizePadding = Math.ceil(Max * ( options.paddingScale * 100) / 100)
      let padding = sizePadding > 0 ? sizePadding : ( options.padding > 0 ? options.padding : 0 )

      console.log('最大值:', Max)
      console.log('最小值:', Min)
      console.log('padding:', padding)
      console.log('sizePadding:', sizePadding)
      let cutWidth = 0
      let cutHeight = 0
      let cutOffsetX = 0
      let cutOffsetY = 0
      // 1:1
      if (options.square) {
        /**
         * 最大值方向: -n and + n
         * 最小值方向居中: ( (最大值 + 2n ) - 最小 )/ 2
         * */
        cutHeight = Max + padding * 2
        cutWidth = Max + padding * 2
        let minOffset = (Max - Min) / 2
        if (whoMax === 'H') {
          cutOffsetX = cropLeft - minOffset - padding
          cutOffsetY = cropTop - padding
        } else {
          cutOffsetX = cropLeft - padding
          cutOffsetY = cropTop - minOffset - padding
        }

      } else {
        /**
         * 描边:
         * top /left -n
         * right(w) / bottom(h) + 2n
         * */
        cutOffsetX = cropLeft - padding
        cutOffsetY = cropTop - padding
        cutWidth = cropWidth + (padding * 2)
        cutHeight = cropHeight + (padding * 2)
        console.table({
          cutOffsetX,
          cutOffsetY,
          cutWidth,
          cutHeight
        })

      }

      canvas.setAttribute("width", cutWidth)
      canvas.setAttribute("height", cutHeight)
      canvas
        .getContext("2d")
        .drawImage(
          imageObject,
          cutOffsetX,
          cutOffsetY,
          cutWidth,
          cutHeight,
          0,
          0,
          cutWidth,
          cutHeight
        )

    } else {
      canvas.setAttribute("width", cropWidth)
      canvas.setAttribute("height", cropHeight)
      canvas
        .getContext("2d")
        .drawImage(
          imageObject,
          cropLeft,
          cropTop,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        )
    }

    // 返回数据类型
    let imageType = 'image/jpeg'

    if (options.type === 'png') {
      imageType = 'image/png'
    } else if (options.type === 'webp') {
      imageType = 'image/webp'
    }

    // 返回对象
    let result = {
      top: cropTop,
      left: cropLeft,
      oWidth: imgWidth,
      oHeight: imgHeight,
      width: 0,
      height: 0,
      type: options.type,
      data: null
    }

    // 判断是否有填充颜色
      let fillCanvas = document.createElement("canvas")
      let fillContext = fillCanvas.getContext("2d")

      let fillImages = new Image()
        fillImages.onload = function () {
        fillCanvas.setAttribute("width", fillImages.width)
        fillCanvas.setAttribute("height", fillImages.height)

        if (options.fillColor) {
          fillContext.fillStyle = options.fillColor
          fillContext.fillRect(0, 0, fillImages.width, fillImages.height)
        }
        fillContext.drawImage(fillImages, 0, 0)
        result.width = fillImages.width
        result.height = fillImages.height

        if (options.dataType === 'blob') {
          fillCanvas.toBlob(function (blob) {
            result.data = blob
          }, imageType, options.quality)
        } else {
          result.data = fillCanvas.toDataURL(imageType, options.quality)
        }

        canvas = null
        fillImages = null
        resolve(result)
      }

      fillImages.src = canvas.toDataURL()

  })
}
