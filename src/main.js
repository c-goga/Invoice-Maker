try {
  require('electron-reloader')(module);
} catch {} // reloads electron app when it detects change

const fs = require("fs");
const docx = require("docx");

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('node:path')
// const sqlite3 = require('sqlite3').verbose();
const sqlite = require('node:sqlite');
const {DatabaseSync} = require('node:sqlite');

const isDevelopment = !app.isPackaged; // checks if app is packaged or not

// const appPath = app.getPath('userData');
const dbPath = path.join(__dirname, 'invoice_companies.db');
const seedPath = isDevelopment ? path.join(__dirname, 'invoice_companies_seed.db') // dev
                  : path.join(process.resourcesPath, 'invoice_companies_seed.db');  // not dev
                  // .resourcesPath gives path to the resources folder in the packaged electron app
// const dbPath = path.join(app.getPath('userData'), 'invoice_companies.db');
console.log('dbPath:', dbPath);
if (!fs.existsSync(dbPath)) {
  fs.copyFileSync(seedPath, dbPath);
}
// const db = new sqlite.Database(dbPath);
const db = new DatabaseSync(dbPath);
console.log('db', db);

let mainWindow;


function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-current-company', async (event) => {
  return new Promise((resolve, reject) => {
    try {
      const get = db.prepare('SELECT * FROM companies WHERE id=1');
      const user = get.get();
      if (!user) {
        throw new Error("No user found.");
      }      
      resolve(user);
    } catch(err) {
      reject(err);
    }
  })


  // return new Promise((resolve, reject) => {
  //   db.prepare('SELECT * FROM companies WHERE id=1', (err, user) => {
  //     if (err) {
  //       console.log('err', err);
  //       reject(err.message);
  //     }
      
  //     if (user) {
  //       resolve(user);
  //       console.log('user', user);
  //     } else {
  //       reject('No user found.');
  //     }
  //   });
  // });
})

// handles creating a new company
ipcMain.handle('create-company', async (event, data) => {
  return new Promise((resolve, reject)  => {
    const {name, invoiceInitials, invoiceNumber, address, city, stateInitials, zipCode } = data;
    const insert = db.prepare('INSERT INTO companies (name, invoice_initials, invoice_number, address, city, state_initials, zip_code) VALUES (?,?,?,?,?,?,?)');
    try {
      insert.run(name, invoiceInitials, invoiceNumber, address, city, stateInitials, zipCode);
      resolve({ id: this.lastId, message: 'Data posted successfully' });
    } catch {
      reject('Error creating company.');
    }

    // insert.run(name, invoiceInitials, invoiceNumber, address, city, stateInitials, zipCode, function(err) {
    //   if (err) {
    //     reject(err.message);
    //   } else {
    //     resolve({ id: this.lastId, message: 'Data posted successfully' });
    //     insert.finalize(); // use when completely done with statement
    //   }
    // });
  });
});

// handles creating the initial company profile
ipcMain.handle('create-initial-company', (event, data) => {
  return new Promise(async (resolve, reject)  => {
    const {fullName, companyName, address, city, stateInitials, zipCode, phoneNumber, email } = data;
    const insert = db.prepare('INSERT INTO companies (full_name, name, address, city, state_initials, zip_code, phone_number, email) VALUES (?,?,?,?,?,?,?,?)');
    try {
      insert.run(fullName, companyName, address, city, stateInitials, zipCode, phoneNumber, email);

      const get = db.prepare('SELECT * FROM companies WHERE id = 1');
      const company = get.get(); // did this so that it wouldn't immediately say no company found, returning the company ensures it is already in the db
      resolve({ company });
    } catch {
      reject("Error creating initial company.");
    }

    // insert.run(fullName, companyName, address, city, stateInitials, zipCode, phoneNumber, email, function(err) {
    //   if (err) {
    //     reject(err.message);
    //   } else {
    //     resolve({ id: this.lastId, message: 'Data posted successfully' });
    //     insert.finalize(); // use when completely done with statement
    //   }
    // });
  });
});

// handles getting all of the companies
ipcMain.handle('get-companies', async (event) => {
  return new Promise((resolve, reject) => {
    try {
      const get = db.prepare('SELECT * FROM companies WHERE id>1 ORDER BY name DESC');
      companies = get.all();
      resolve(companies);
      console.log('Companies:', companies);
    } catch {
      reject('No companies found.');
    }
    // db.all('SELECT * FROM companies WHERE id>1 ORDER BY name DESC', (err, companies) => {
    //   if (err) {
    //     console.log('err', err);
    //     reject(err.message);
    //   }

    //   if (companies) {
    //     resolve(companies);
    //     console.log('companies', companies);
    //   } else {
    //     reject('No companies found.');
    //   }
    // });
  });
});

// handles updating data for a company
ipcMain.handle('update-company', async (event, data) => {
  return new Promise((resolve, reject) => {
    const {name, invoiceInitials, invoiceNumber, address, city, stateInitials, zipCode, quantity, unitPrice, description, id } = data;
    const update = db.prepare('UPDATE companies SET name=?, invoice_initials=?, invoice_number=?,address=?,city=?,state_initials=?,zip_code=?,quantity=?,unit_price=?, description=? WHERE id=?');
    try {
      update.run(name, invoiceInitials, invoiceNumber, address, city, stateInitials, zipCode, quantity, unitPrice, description, id);
      resolve({ id: this.lastId, message: 'Data updated successfully' });
    } catch {
      reject("Error updating company");
    }
    // update.run(name, invoiceInitials, invoiceNumber, address, city, stateInitials, zipCode, quantity, unitPrice, description, id, function(err) {
    //   if (err) {
    //     console.log('err', err);
    //     reject(err.message);
    //   } else {
    //     resolve({ id: this.lastId, message: 'Data updated successfully' });
    //     update.finalize();
    //   }
    // });
  });
});

// handles updating data for current company
ipcMain.handle('update-current-company', async (event, data) => {
  return new Promise((resolve, reject) => {
    const {fullName, companyName, address, city, stateInitials, zipCode, phoneNumber, email } = data;
    const update = db.prepare('UPDATE companies SET full_name=?,name=?,address=?,city=?,state_initials=?,zip_code=?,phone_number=?,email=? WHERE id=1');
    try {
      update.run(fullName, companyName, address, city, stateInitials, zipCode, phoneNumber, email);
      resolve({ id: this.lastId, message: 'Data updated successfully' });
    } catch {
      reject("Error updating current company");
    }
    // update.run(fullName, companyName, address, city, stateInitials, zipCode, phoneNumber, email, function(err) {
    //   if (err) {
    //     console.log('err', err);
    //     reject(err.message);
    //   } else {
    //     resolve({ id: this.lastId, message: 'Data updated successfully' });
    //     update.finalize();
    //   }
    // });
  });
});

async function warnOverwrite(browserWindow, file) {
  const options = {
    message: `The file ${file} already exists. Are you sure you want to overwrite it?`,
    type: 'warning',
    buttons: ['Overwrite', 'Cancel'],
    defaultId: 1,
    title: 'Confirm Overwrite',
    detail: 'This action cannot be undone.',
  };

  const response = await dialog.showMessageBox(browserWindow, options);

  if (response.response == 0) {
    console.log('overwrite');
    return true;
  } else {
    console.log('cancel');
    return false;
  }
}

// handles opening folder location after file save if the user wants to
ipcMain.handle('open-folder', async (event, data) => {
  return new Promise(async (resolve, reject) => {
    console.log('path', data);
    const options = {
      message: "File successfully saved.",
      type: "info",
      buttons: ["Open folder location", "Close"],
      title: "Invoice Maker",
      defaultId: 1,
      cancelId: 1,
    }

    const fileSuccess = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options);
    if (fileSuccess.response == 0) {
      console.log("Focused window:", BrowserWindow.getFocusedWindow());
        try {
          shell.showItemInFolder(`${data}.docx`);
          resolve('successfully opened file');
        } catch {
          reject('error opening file');
        }
    } else {
      resolve('folder box closed');
    }
  });
});

// handles showing box to user that the file was saved
ipcMain.handle('show-save', async (event) => {
  return new Promise(async (resolve, reject) => {
    const options = {
      message: "Company profile successfully saved.",
      type: "info",
      buttons: ["Close"],
      title: "Invoice Maker",
      defaultId: 0,
      cancelId: 0,
    }

    await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options);
    resolve('succussful save box');
  });
});

// handles showing warning box to user to save before company profile change
ipcMain.handle('show-save-before-change', async (event) => {
  return new Promise(async (resolve, reject) => {
    const options = {
      message: "Changes detected. Do you want to save before changing profiles?",
      type: "warning",
      buttons: ["Save", "Do not save", "Cancel"],
      title: "Invoice Maker",
      defaultId: 2,
      cancelId: 2,
    }
    const response = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options);
    resolve(response.response);
  });

});

// handles showing warning box to user to save before exiting software
ipcMain.handle('show-save-before-exit', async (event) => {
  console.log('closing');
  const options = {
    message: "Changes detected. Do you want to save before exiting?",
    type: "warning",
    buttons: ["Save", "Do not save", "Cancel"],
    title: "Invoice Maker",
    defaultId: 2,
    cancelId: 2,
  }

  const response = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options);
  return response.response;
});

ipcMain.handle('close-window', (event) => {
  mainWindow.close();
});

ipcMain.handle('delete-company', async (event, data) => {
  const options = {
    message: "Are you sure you want to delete this company?",
    type: "warning",
    buttons: ["Delete", "Cancel"],
    title: "Invoice Maker",
    defaultId: 1,
    cancelId: 1,
  }

  const response = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options);
  return new Promise((resolve, reject) => {
    if (response.response == 0) {
      const id = data;
      const remove = db.prepare('DELETE FROM companies WHERE id=?');
      try {
        remove.run(id);
        resolve("Company successfully deleted.");
      } catch {
        reject("Error deleting company.");
      }
  } else {
      reject("Undo delete company.")
  }
  })
});

// handles creating a document
ipcMain.handle('create-file', async (event, data) => {
  return new Promise((resolve, reject) => {
    try {
      const {fullName, currentCompanyName, currentCompanyAddress, currentCompanyCity, currentCompanyStateInitials, currentCompanyZipCode, phoneNumber, email, 
        companyProfileName, invoiceInitials, invoiceNumber, date, companyProfileAddress, companyProfileCity, companyProfileStateInitials, companyProfileZipCode, quantity, unitPrice, description, filePath, id} = data;

      let defaultFilePath;
      if (filePath != null) {
        defaultFilePath = filePath;
      } else {
        defaultFilePath = path.join(app.getPath('documents'), "");
      }
      
      dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultFilePath,
        buttonLabel: "Save",
        title: "Choose a download location"
      }).then(async result => {
        let newFilePath;
        let warning = true;
        console.log('filePath: ', result.filePath);
        const periodIdx = result.filePath.lastIndexOf('.');
        console.log('idx', periodIdx)
        if (periodIdx != -1) {
          newFilePath = result.filePath.substring(0, periodIdx);
          warning = false;
        } else {
          newFilePath = result.filePath;
        }
        console.log('newFilePath: ', result.filePath);
        // checks if file already exists
        let overwrite = true;
        if (fs.existsSync(`${newFilePath}.docx`) && warning) {
          const doOverwrite = await warnOverwrite(BrowserWindow.getFocusedWindow(), `${path.basename(newFilePath)}.docx`);
          if (!doOverwrite) {
            overwrite = false;
          }
        }

        if (!result.canceled && newFilePath != "" && overwrite) {
          // use when wanting to go to the next line or need extra space
          const breakText = new docx.TextRun({
            break: 1,
          });

          // top table used for current company and company profile info
          const headerTable = new docx.Table({
            // no borders
            borders: {
              top: {
                style: docx.BorderStyle.NONE,
              },
              bottom: {
                style: docx.BorderStyle.NONE,
              },
              right: {
                style: docx.BorderStyle.NONE,
              },
              left: {
                style: docx.BorderStyle.NONE,
              },
              insideHorizontal: {
                style: docx.BorderStyle.NONE,
              },
              insideVertical: {
                style: docx.BorderStyle.NONE,
              }
            },

            rows: [
              new docx.TableRow({
                children:[
                  new docx.TableCell({
                    width: {
                      size: 6000,
                      type: docx.WidthType.DXA,
                    },

                    // adds space between the text and border
                    margins: {
                      top: 75,
                      bottom: 75,
                      left: 75,
                      right: 75,
                    },
                    
                    children: [
                      new docx.Paragraph({

                        children: [
                          new docx.TextRun({
                          text: currentCompanyName,
                          bold: true,
                          size: 32,
                          font: "Arial (Headings)",
                        }),

                        breakText,
                      
                        new docx.TextRun({
                          text: currentCompanyAddress,
                          size: 24,
                          font: "Arial (Body)",
                        }),

                        breakText,

                        new docx.TextRun({
                          text: `${currentCompanyCity}, ${currentCompanyStateInitials} ${currentCompanyZipCode}`,
                          size: 24,
                          font: "Arial (Body)",
                        }),

                        breakText,

                        new docx.TextRun({
                          text: phoneNumber,
                          size: 24,
                          font: "Arial (Body)",
                        }),

                        breakText,
                        ]
                      })
                      ]
                  }),

                  new docx.TableCell({
                    width: {
                      size: 6000,
                      type: docx.WidthType.DXA,
                    },

                    // adds space between the text and border
                    margins: {
                      top: 75,
                      bottom: 75,
                      left: 75,
                      right: 75,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: "INVOICE",
                            bold: true,
                            size: 40,
                            font: "Arial (Headings)",
                            color: "595959",

                          }),

                          breakText,
                          breakText,
                          breakText,

                          new docx.TextRun({
                            text: `INVOICE # ${invoiceInitials}${invoiceNumber}`,
                            size: 24,
                            font: "Arial (Body)",
                          }),

                          breakText,

                          new docx.TextRun({
                            text: `DATE: ${date.slice(5,7)}/${date.slice(8)}/${date.slice(0,4)}`,
                            size: 24,
                            font: "Arial (Body)",
                          }),

                          breakText,
                        ]
                      })
                    ]
                  })
                ]
              }),

              new docx.TableRow({
                children:[
                  new docx.TableCell({

                    // adds space between the text and border
                    margins: {
                      top: 75,
                      bottom: 75,
                      left: 75,
                      right: 75,
                    },

                    children: [
                      new docx.Paragraph({
                        children: [
                          new docx.TextRun({
                            text: "TO:",
                            bold: true,
                            size: 24,
                            font: "Arial (Body)"
                          }),

                          breakText,

                          new docx.TextRun({
                            text: companyProfileName,
                            size: 24,
                            font: "Arial (Body)"
                          }),

                          breakText,

                          new docx.TextRun({
                            text: companyProfileAddress,
                            size: 24,
                            font: "Arial (Body)",
                          }),

                          breakText,

                          new docx.TextRun({
                            text: `${companyProfileCity}, ${companyProfileStateInitials} ${companyProfileZipCode}`,
                            size: 24,
                            font: "Arial (Body)",
                          }),

                          breakText,
                          breakText,
                          breakText,
                        ]
                      })
                    ]
                  }),
                ]
              })
            ]
          });

          const inventoryTable = new docx.Table({
            borders: {
              top: {
                style: docx.BorderStyle.NONE,
              },
              bottom: {
                style: docx.BorderStyle.NONE,
              },
              right: {
                style: docx.BorderStyle.NONE,
              },
              left: {
                style: docx.BorderStyle.NONE,
              },
              insideHorizontal: {
                style: docx.BorderStyle.NONE,
              },
              insideVertical: {
                style: docx.BorderStyle.NONE,
              }
            },

            width: {
              size: 10000,
              type: docx.WidthType.DXA,
            },

            rows: [
              new docx.TableRow({
                

                children: [
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },

                    width: {
                      size: 1000,
                      type: docx.WidthType.PERCENTAGE,
                    },

                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 100,
                      bottom: 100,
                      left: 100,
                      right: 100,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.CENTER,

                        children: [
                          new docx.TextRun({
                            text: "QUANTITY",
                            bold: true,
                            size: 24,
                            font: "Arial (Headings)",
                          })
                        ]
                      })
                    ]
                  }),

                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    width: {
                      size: 2500,
                      type: docx.WidthType.PERCENTAGE,
                    },

                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 100,
                      bottom: 100,
                      left: 100,
                      right: 100,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.CENTER,

                        children: [
                          new docx.TextRun({
                            text: "DESCRIPTION",
                            bold: true,
                            size: 24,
                            font: "Arial (Headings)",
                          })
                        ]
                      })
                    ]
                  }),

                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    width: {
                      size: 750,
                      type: docx.WidthType.PERCENTAGE,
                    },

                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 100,
                      bottom: 100,
                      left: 100,
                      right: 100,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.CENTER,

                        children: [
                          new docx.TextRun({
                            text: "UNIT PRICE",
                            bold: true,
                            size: 24,
                            font: "Arial (Headings)",
                          })
                        ]
                      })
                    ]
                  }),

                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    width: {
                      size: 750,
                      type: docx.WidthType.PERCENTAGE,
                    },

                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 100,
                      bottom: 100,
                      left: 100,
                      right: 100,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.CENTER,

                        children: [
                          new docx.TextRun({
                            text: "TOTAL",
                            bold: true,
                            size: 24,
                            font: "Arial (Headings)",
                          })
                        ]
                      })
                    ]
                  }),
                ]
              }),

              new docx.TableRow({
                children: [
                  // table cell for quantity
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    verticalAlign: docx.VerticalAlign.CENTER,

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.CENTER,

                        children: [
                          new docx.TextRun({
                            text: `${quantity}`,
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ]
                  }),

                  // table cell for description
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 100,
                      bottom: 100,
                      left: 150,
                      right: 150,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.LEFT,

                        children: [
                          new docx.TextRun({
                            text: description,
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ]
                  }),

                  // table cell for unit price
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 100,
                      bottom: 100,
                      left: 150,
                      right: 150,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: `$${(unitPrice).toFixed(2)}`,
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ]
                  }),

                  // table cell for total
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 100,
                      bottom: 100,
                      left: 150,
                      right: 150,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: `$${(unitPrice * quantity).toFixed(2)}`,
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ]
                  }),
                ]
              }),

              new docx.TableRow({
                height: {
                  value: 350,
                  rule: docx.HeightRule.EXACT
                },

                children: [
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                ]
              }),

              new docx.TableRow({
                height: {
                  value: 350,
                  rule: docx.HeightRule.EXACT
                },

                children: [
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                ]
              }),

              new docx.TableRow({
                height: {
                  value: 350,
                  rule: docx.HeightRule.EXACT
                },

                children: [
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                ]
              }),

              new docx.TableRow({
                height: {
                  value: 350,
                  rule: docx.HeightRule.EXACT
                },

                children: [
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                ]
              }),

              new docx.TableRow({
                height: {
                  value: 350,
                  rule: docx.HeightRule.EXACT
                },

                children: [
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                ]
              }),

              new docx.TableRow({
                height: {
                  value: 350,
                  rule: docx.HeightRule.EXACT
                },

                children: [
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                ]
              }),

              new docx.TableRow({
                height: {
                  value: 350,
                  rule: docx.HeightRule.EXACT
                },

                children: [
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                  new docx.TableCell({

                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },
                    children: []
                  }),
                ]
              }),

              new docx.TableRow({
                children: [
                  new docx.TableCell({
                    children:[]
                  }),

                  new docx.TableCell({
                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 150,
                      bottom: 150,
                      right: 150,
                    },

                    columnSpan: 2,

                    children:[
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: "SUBTOTAL",
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ]
                  }),

                  new docx.TableCell({
                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },

                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      right: 200,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: `$${(unitPrice * quantity).toFixed(2)}`,
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ],
                  })
                ]
              }),

              new docx.TableRow({
                children: [
                  new docx.TableCell({
                    children:[]
                  }),

                  new docx.TableCell({
                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 150,
                      bottom: 150,
                      right: 150,
                    },

                    columnSpan: 2,

                    children:[
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: "SALES TAX",
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ]
                  }),

                  new docx.TableCell({
                    
                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },

                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      right: 200,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: "N/A",
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ],
                  })
                ]
              }),

              new docx.TableRow({
                children: [
                  new docx.TableCell({
                    children:[]
                  }),

                  new docx.TableCell({
                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 150,
                      bottom: 150,
                      right: 150,
                    },

                    columnSpan: 2,

                    children:[
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: "SHIPPING AND HANDLING",
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ]
                  }),

                  new docx.TableCell({
                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },

                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      right: 200,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: "N/A",
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ],
                  })
                ]
              }),

              new docx.TableRow({
                children: [
                  new docx.TableCell({

                    children:[]
                  }),

                  new docx.TableCell({
                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      top: 150,
                      bottom: 150,
                      right: 150,
                    },

                    columnSpan: 2,

                    children:[
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: "TOTAL DUE",
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ]
                  }),

                  new docx.TableCell({
                    borders: {
                      top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      right: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                      left: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "aaaaaa",
                      },
                    },

                    verticalAlign: docx.VerticalAlign.CENTER,

                    margins: {
                      right: 200,
                    },

                    children: [
                      new docx.Paragraph({
                        alignment: docx.AlignmentType.RIGHT,

                        children: [
                          new docx.TextRun({
                            text: `$${(unitPrice * quantity).toFixed(2)}`,
                            size: 24,
                            font: "Arial (Body)",
                          })
                        ]
                      })
                    ],
                  })
                ]
              }),
            ]
          });

          const doc = new docx.Document({ 
            sections: [{
              properties: {
                page: {
                  margin: {
                    top: ".75in",
                    right: ".75in",
                    bottom: ".7in",
                    left: ".75in",
                  }
                }
              },
              children: [
                headerTable, 
                new docx.Paragraph({
                  children: []
                }),
                inventoryTable,
                new docx.Paragraph({
                  children: [
                    breakText,
                    new docx.TextRun({
                      text: `Make all checks payable to ${currentCompanyName}`,
                      size: 24,
                      font: "Arial (Body)",
                    }),
                    breakText,
                    breakText,
                    breakText,
                    new docx.TextRun({
                      text: "If you have any questions concerning this invoice, contact",
                      size: 24,
                      font: "Arial (Body)",
                    }),
                    breakText,
                    new docx.TextRun({
                      text: `${fullName} ${phoneNumber}`,
                      size: 24,
                      font: "Arial (Body)",
                    }),
                    breakText,
                    new docx.TextRun({
                      text: "Email: ",
                      size: 24,
                      font: "Arial (Body)",
                    }),
                    new docx.ExternalHyperlink({
                      children:[
                        new docx.TextRun({
                          text: `${email}`,
                          size: 24,
                          font: "Arial (Body)",
                          style: "Hyperlink",
                        }),
                      ],
                      link: `mailto:${email}`,
                    }),
                  ]
                }),
              ]
            }]
          })

          let fileOpen = false;

          // saves the file
          await docx.Packer.toBuffer(doc).then(buffer => {
            fs.writeFileSync(`${newFilePath}.docx`, buffer);
            const updateFileCreate = db.prepare('UPDATE companies SET invoice_number=?, file_path=? WHERE id=?');
            try {
              updateFileCreate.run(parseInt(invoiceNumber) + 1, newFilePath, id);
              // resolve({ id: this.lastId, message: 'File path updated successfully' });
            } catch {
              reject("Error with file path save.")
            }
            // updateFileCreate.run(parseInt(invoiceNumber) + 1, newFilePath, id, function(err) {
            // if (err) {
            //     console.log('err with file path save', err);
            //     reject(err.message);
            //   } else {
            //     resolve({ id: this.lastId, message: 'File path updated successfully' });
            //     updateFileCreate.finalize();
            //   }
            // });
          }).catch(err => {
            console.error('error creating docx', err);
            if (err.code == 'EBUSY') {
              // if the user attempts to save while the doc is open
              dialog.showErrorBox("Cannot overwrite file while file is open.", "Close file to overwrite successfully.")
              fileOpen = true;
            }
          });

          if (fileOpen) {
            reject('No overwrite since file open.');
          }

          resolve(newFilePath);
        } else {
          reject('No overwrite or cancelled');
        }
      }).catch(err => {
        console.error("error with file location", err.message);
      });
    } catch (err) {
      console.log('err', err);
      reject(err.message);
    }
  });
});
