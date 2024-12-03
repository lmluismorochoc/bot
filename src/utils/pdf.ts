import { PageSizes, PDFDocument, PDFFont, PDFPage, StandardFonts } from 'pdf-lib';

const MARGIN = 50;

const drawTextFunction = (
  page: PDFPage,
  text: string,
  y: number,
  x: number,
  font: PDFFont,
) => {
  page.drawText(text, { x, y, font, size: 10 });
}

export const generatePdfFromText = async (userData: string) => {
  const pdfDoc = await PDFDocument.create();
  const pdfFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [ width, height ] = PageSizes.A4;
  let pageNumber = 0;
  const lines = userData.split('\n');
  let currentPage = pdfDoc.addPage([width, height]);
  let currentY = height - MARGIN;
  let pdfBytes;

  const pageNumberSettings = {
    x: width - 70,
    y: 20,
    font: pdfFont,
    size: 9,
  };

  for (let line of lines) {
    const words = line.split(' ');
    let currentX = MARGIN;
    let text = '';
    let isBold = false; // Track whether the current word(s) should be bold
    for (let word of words) {
      if (word.startsWith('***') && word.endsWith('***')) {
        const sentence = word.substring(3, word.length - 3);
        const sentenceWidth = boldFont.widthOfTextAtSize(sentence + ' ', 10);
        if (currentX + sentenceWidth > width - 100) {
          currentY -= pdfFont.heightAtSize(10);
          if (currentY < MARGIN) {
            currentPage.drawText(`Page ${pageNumber + 1}`, pageNumberSettings);
            pageNumber++;
            currentPage = pdfDoc.addPage([width, height]);
            currentY = height - 50;
          }
          currentX = MARGIN;
        }
        // Draw the text with appropriate font based on the isBold flag
        drawTextFunction(currentPage, text, currentY, currentX, isBold ? boldFont : pdfFont);
        currentX += isBold ? boldFont.widthOfTextAtSize(text, 10) : pdfFont.widthOfTextAtSize(text, 10);
        // Draw the bold sentence
        drawTextFunction(currentPage, sentence + ' ', currentY, currentX, boldFont);
        currentX += sentenceWidth;
        text = '';
        isBold = false;
      } else if (word.startsWith('***')) {
        // If a new bold section starts
        const sentence = word.substring(3) + ' ';
        const sentenceWidth = boldFont.widthOfTextAtSize(sentence, 10);
        if (currentX + sentenceWidth > width - 100) {
          currentY -= pdfFont.heightAtSize(10);
          if (currentY < MARGIN) {
            currentPage.drawText(`Page ${pageNumber + 1}`, pageNumberSettings);
            pageNumber++;
            currentPage = pdfDoc.addPage([width, height]);
            currentY = height - 50;
          }
          currentX = MARGIN;
        }
        // Draw the text with appropriate font based on the isBold flag
        drawTextFunction(currentPage, text, currentY, currentX, isBold ? boldFont : pdfFont);
        currentX += isBold ? boldFont.widthOfTextAtSize(text, 10) : pdfFont.widthOfTextAtSize(text, 10);
        // Draw the bold sentence
        drawTextFunction(currentPage, sentence, currentY, currentX, boldFont);
        currentX += sentenceWidth;
        text = '';
        isBold = true;
      } else if (word.endsWith('***')) {
        // If a bold section ends
        const sentence = word.substring(0, word.length - 3) + ' ';
        const sentenceWidth = boldFont.widthOfTextAtSize(sentence, 10);
        if (currentX + sentenceWidth > width - 100) {
          currentY -= pdfFont.heightAtSize(10);
          if (currentY < MARGIN) {
            currentPage.drawText(`Página ${pageNumber + 1}`, pageNumberSettings);
            pageNumber++;
            currentPage = pdfDoc.addPage([width, height]);
            currentY = height - 50;
          }
          currentX = MARGIN;
        }
        // Draw the text with appropriate font based on the isBold flag
        drawTextFunction(currentPage, text, currentY, currentX, isBold ? boldFont : pdfFont);
        currentX += isBold ? boldFont.widthOfTextAtSize(text, 10) : pdfFont.widthOfTextAtSize(text, 10);
        // Draw the bold sentence
        drawTextFunction(currentPage, sentence, currentY, currentX, boldFont);
        currentX += sentenceWidth;
        text = '';
        isBold = false;
      } else if (currentX + pdfFont.widthOfTextAtSize(`${text}${word} `, 10) > width - 100) {
        // If a line overflows, draw the current text and start a new line
        drawTextFunction(currentPage, text, currentY, currentX, isBold ? boldFont : pdfFont);
        currentY -= pdfFont.heightAtSize(10);
        if (currentY < MARGIN) {
          currentPage.drawText(`Página ${pageNumber + 1}`, pageNumberSettings);
          pageNumber++;
          currentPage = pdfDoc.addPage([width, height]);
          currentY = height - 50;
        }
        currentX = MARGIN;
        text = word + ' ';
        isBold = false;
      } else {
        text += word + ' ';
      }
    }
    // Draw the remaining text at the end of the line
    drawTextFunction(currentPage, text, currentY, currentX, isBold ? boldFont : pdfFont);
    currentY -= pdfFont.heightAtSize(10);
    if (currentY < MARGIN) {
      currentPage.drawText(`Página ${pageNumber + 1}`, pageNumberSettings);
      pageNumber++;
      currentPage = pdfDoc.addPage([width, height]);
      currentY = height - 50;
    }
  }
  currentPage.drawText(`Página ${pageNumber + 1}`, pageNumberSettings);

  pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export const mergePdfs = async (existingPdfBuffer: Buffer, newPdfBuffer: Buffer) => {
  try {
    const existingPdfDoc = await PDFDocument.load(existingPdfBuffer);
    const newPdfDoc = await PDFDocument.load(newPdfBuffer);

    const newPages = await existingPdfDoc.copyPages(newPdfDoc, newPdfDoc.getPageIndices());

    for (const newPage of newPages) {
      existingPdfDoc.addPage(newPage);
    }

    const mergedPdfBytes = await existingPdfDoc.save();
    return Buffer.from(mergedPdfBytes);
  } catch (error) {
    throw new Error('Failed to merge the PDFs.');
  }
}