// Handles initial startup
console.log('window', window.location.href.split('/').pop());
// Gets the last thing in the file location and uses it to see if it is on the edit-profile page.
// It is used in this if statement so that it doesn't rerun when the HTML page changes.

let changed = false;
let previousCompanyProfileId;
// function addChangeListener(input, originalValue) {
//     input.addEventListener('input', e => {
//         const changedValue = input.value;
//         if (!changed && changedValue != originalValue) {
//             changed = true;
//         }
//     });
// }

function setUpInput(input, originalValue, validationMessage="") {
    if (originalValue != null) {
        input.addEventListener('input', e => {
            const changedValue = input.value;
            if (!changed && changedValue != originalValue) {
                changed = true;
            }
        });
    }

    if (validationMessage != "") {
        input.addEventListener('invalid', e => {
            e.target.setCustomValidity(validationMessage);
        });
    }
}

function save(e, editInfo, user) {
    const name = document.getElementById('company-name').value;
    const invoiceInitials = document.getElementById('invoice-initials').value;
    const invoiceNumber = document.getElementById('invoice-number').value;
    const address = document.getElementById('company-address').value;
    const city = document.getElementById('company-city').value;
    const stateInitials = document.getElementById('state-initials').value;
    const zipCode = document.getElementById('company-zip-code').value;
    const quantity = document.getElementById('company-quantity').value;
    const unitPrice = document.getElementById('company-unit-price').value;
    const description = document.getElementById('company-description').value;
    const id = previousCompanyProfileId;
    if (name == "" || invoiceInitials == "" || invoiceNumber == "" || address == "" || city == "" || stateInitials == "" || zipCode == "") {
        console.log('no save');
    } else {
        const response = window.api.updateCompany({name, invoiceInitials, invoiceNumber, address, city, stateInitials, zipCode, quantity, unitPrice, description, id}).then(e => {
            updateCompanySidebar(editInfo, user);
            // fileButton.disabled = false;
            // removeWarningBeforeFileCreation();
            window.api.showSaveBox();
        });
        console.log('update res:', response);
    }
}

function updateCompanySidebar(editInfo, user) {
    // handles save, not save, or cancel on exit when changes are detected
    window.addEventListener('beforeunload', async e => {
        if (changed) {
            e.preventDefault();
            const response = await window.api.showSaveBeforeExitBox();
            console.log('close res', response);
            if (response == 0) {
                changed = false;
                save(editInfo, user);
                window.api.closeWindow();
            } else if (response == 1) {
                changed = false;
                window.api.closeWindow();
            }
        }
    });

    // Handles populating companies on side
    const companyList = document.getElementById('company-list');
    console.log('list', companyList);
    companyList.textContent = "";
    window.api.getCompanies().then(companies => {
        console.log('companies', companies);
        companies.forEach(company => {
            console.log('c', company);
            const companyProfileTemplate = document.getElementById('company-template');
            const companyProfile = companyProfileTemplate.content.cloneNode(true);
            companyProfile.getElementById('company-profile-button').innerText = company.name;
            companyProfile.getElementById('company-profile-button').id = company.id;
            companyList.prepend(companyProfile);

            // Adds click event listener to button on side
            const currentCompanyProfile = document.getElementById(company.id);
            // Adds selected class to clicked profile if user saved through the warning given
            if (company.id == previousCompanyProfileId) {
                currentCompanyProfile.classList.add('selected');
            }
            console.log('company profile', currentCompanyProfile);
            currentCompanyProfile.addEventListener('click', async e => {
                let cancel = false;
                if (changed) {
                    const changeResponse = await window.api.showSaveBeforeChangeBox();
                    if (changeResponse == 0) {
                        changed = false;
                        save(editInfo, user);
                    } else if (changeResponse == 1) {
                        changed = false;
                    } else {
                        cancel = true;
                    }
                }

                if (!cancel) {
                    previousCompanyProfileId = company.id;
                    const companyProfiles = document.querySelectorAll('.company');
                    companyProfiles.forEach(companyProfile => {
                        companyProfile.classList.remove('selected');
                    });
                    currentCompanyProfile.classList.add('selected');
                    const companyFormTemplate = document.getElementById('edit-company-template');
                    const companyForm = companyFormTemplate.content.cloneNode(true);
                    setUpInput(companyForm.getElementById('company-name'), company.name, "Please input company name.");
                    companyForm.getElementById('company-name').value = company.name;
                    setUpInput(companyForm.getElementById('invoice-initials'), company.invoice_initials, "Please input company invoice initials.");
                    companyForm.getElementById('invoice-initials').value = company.invoice_initials;
                    setUpInput(companyForm.getElementById('invoice-number'), company.invoice_number, "Please input company invoice number.");
                    companyForm.getElementById('invoice-number').value = company.invoice_number;

                    // getting current date from stack overflow
                    // https://stackoverflow.com/questions/23593052/format-javascript-date-as-yyyy-mm-dd
                    let today = new Date();
                    const offset = today.getTimezoneOffset();
                    today = new Date(today.getTime() - (offset * 60 * 1000));
                    companyForm.getElementById('date').value = today.toISOString().split('T')[0];
                    // end of stack overflow usage

                    setUpInput(companyForm.getElementById('company-address'), company.address, "Please input company address.");
                    companyForm.getElementById('company-address').value = company.address;
                    setUpInput(companyForm.getElementById('company-city'), company.city, "Please input company city.");
                    companyForm.getElementById('company-city').value = company.city;
                    setUpInput(companyForm.getElementById('state-initials'), company.state_initials, "Please select company state initials.");
                    companyForm.getElementById('state-initials').value = company.state_initials;
                    setUpInput(companyForm.getElementById('company-zip-code'), company.zip_code, "Please input company zip code.");
                    companyForm.getElementById('company-zip-code').value = company.zip_code;
                    setUpInput(companyForm.getElementById('company-quantity'), company.quantity);
                    companyForm.getElementById('company-quantity').value = company.quantity;
                    setUpInput(companyForm.getElementById('company-unit-price'), company.unit_price);
                    companyForm.getElementById('company-unit-price').value = company.unit_price;
                    setUpInput(companyForm.getElementById('company-description'), company.description);
                    companyForm.getElementById('company-description').value = company.description;

                    editInfo.innerText = "";
                    editInfo.appendChild(companyForm);
                    intInput();
                    doubleInput();
                    initialsInput();
                    const editCompanyForm = document.getElementById('edit-company-form');
                    console.log('ccp after', currentCompanyProfile);
                    editCompanyForm.addEventListener('submit', async e => {
                        e.preventDefault();
                        const buttonId = e.submitter.id;
                        if (buttonId == 'save') {
                            save(editInfo, user);
                        } else if (buttonId == 'create-file-button') {
                            const fullName = user.full_name;
                            const currentCompanyName = user.name;
                            const currentCompanyAddress = user.address;
                            const currentCompanyCity = user.city;
                            const currentCompanyStateInitials = user.state_initials;
                            const currentCompanyZipCode = user.zip_code;
                            const phoneNumber = user.phone_number;
                            const email = user.email;

                            // const companyProfileName = document.getElementById('company-name').value;
                            // const invoiceNumber = document.getElementById('invoice-number').value;
                            // const date = document.getElementById('date').value;
                            // const companyProfileAddress = document.getElementById('company-address').value;
                            // const companyProfileCity = document.getElementById('company-city').value;
                            // const companyProfileStateInitials = document.getElementById('state-initials').value;
                            // const companyProfileZipCode = document.getElementById('company-zip-code').value;
                            // const quantity = document.getElementById('company-quantity').value;
                            // const unitPrice = document.getElementById('company-unit-price').value;
                            // const description = document.getElementById('company-description').value;

                            const companyProfileName = document.getElementById('company-name').value;
                            const invoiceInitials = document.getElementById('invoice-initials').value;
                            const invoiceNumber = document.getElementById('invoice-number').value;
                            const date = document.getElementById('date').value;
                            const companyProfileAddress = document.getElementById('company-address').value;
                            const companyProfileCity = document.getElementById('company-city').value;
                            const companyProfileStateInitials = document.getElementById('state-initials').value;
                            const companyProfileZipCode = document.getElementById('company-zip-code').value;
                            const quantity = parseInt(document.getElementById('company-quantity').value);
                            const unitPrice = parseFloat(document.getElementById('company-unit-price').value);
                            const description = document.getElementById('company-description').value;
                            const filePath = company.file_path;
                            const id = company.id;
                            if (companyProfileName == "" || invoiceInitials == "" || invoiceNumber == "" || companyProfileAddress == "" || companyProfileCity == "" || companyProfileStateInitials == "" || companyProfileZipCode == "") {
                                e.preventDefault();
                            }
                            const response = window.api.createFile({fullName, currentCompanyName, currentCompanyAddress, currentCompanyCity, currentCompanyStateInitials,
                                currentCompanyZipCode, phoneNumber, email, companyProfileName, invoiceInitials, invoiceNumber, date, companyProfileAddress, companyProfileCity, 
                                companyProfileStateInitials, companyProfileZipCode, quantity, unitPrice, description, filePath, id}).then(newFilePath => {
                                    window.api.openFolderBox(newFilePath);
                                    document.getElementById('invoice-number').value = parseInt(document.getElementById('invoice-number').value) + 1;
                                }).catch();
                            console.log('file creation res', response);
                        } else if (buttonId == 'delete-company-button') {
                            const response = window.api.deleteCompany(company.id).then(res => {
                                location.reload();
                            });
                            console.log("Delete response:", response);
                        }
                    })
                }
            });
        })
    }).catch(err => {
        console.log('err', err);
    })

    const createCompanyButtonTemplate = document.getElementById('create-company-button-template');
    const createCompanyButtonClone = createCompanyButtonTemplate.content.cloneNode(true);
    companyList.appendChild(createCompanyButtonClone);
    const createCompanyButton = document.getElementById('create-company-button');
    console.log('cc-button', createCompanyButton);
    createCompanyButton.addEventListener('click', e => {
        // e.preventDefault();
        const companyProfiles = document.querySelectorAll('.company');
        console.log('profiles', companyProfiles);
        companyProfiles.forEach(companyProfile => {
            companyProfile.classList.remove('selected');
        });
        createCompanyButton.classList.add('selected');
        const createCompanyTemplate = document.getElementById('create-company-template');
        const createCompany = createCompanyTemplate.content.cloneNode(true);
        editInfo.innerText = "";
        editInfo.appendChild(createCompany);
        intInput();
        initialsInput();
        setUpInput(document.getElementById('company-name'), null, "Please input company name.");
        setUpInput(document.getElementById('invoice-initials'), null, "Please input company invoice initials.");
        setUpInput(document.getElementById('invoice-number'), null, "Please input company invoice number.");
        setUpInput(document.getElementById('company-address'), null, "Please input company address.");
        setUpInput(document.getElementById('company-city'), null, "Please input company city.");
        setUpInput(document.getElementById('state-initials'), null, "Please select company state initials.");
        setUpInput(document.getElementById('company-zip-code'), null, "Please input company zip code.");

        const createCompanyForm = document.getElementById('create-company-form');
        createCompanyForm.addEventListener('submit', e => {
            e.preventDefault();
            const name = document.getElementById('company-name').value;
            const invoiceInitials = document.getElementById('invoice-initials').value;
            const invoiceNumber = document.getElementById('invoice-number').value;
            const address = document.getElementById('company-address').value;
            const city = document.getElementById('company-city').value;
            const stateInitials = document.getElementById('state-initials').value;
            const zipCode = document.getElementById('company-zip-code').value;
            if (name == "" || invoiceInitials == "" || invoiceNumber == "" || address == "" || city == "" || stateInitials == "" || zipCode == "") {
                console.log('no save');
            } else {
                const response = window.api.createCompany({name, invoiceInitials, invoiceNumber, address, city, stateInitials, zipCode});
                console.log('create res:', response);
                location.reload();
            }
        })

        // const submitButton = document.getElementById('create-company-submit');
        // submitButton.addEventListener('submit', e => {
        //     e.preventDefault();
        //     const name = document.getElementById('company-name').value;
        //     const number = document.getElementById('invoice-number').value;
        //     const address = document.getElementById('company-address').value;
        //     const city = document.getElementById('company-city').value;
        //     const stateInitials = document.getElementById('state-initials').value;
        //     const zipCode = document.getElementById('company-zip-code').value;

        //     const response = window.api.createCompany({name, number, address, city, stateInitials, zipCode});
        //     console.log('create res:', response);
        // })
    })
}

if (window.location.href.split('/').pop() != 'edit-profile.html') {
    window.api.getCurrentCompany().then(user => {
        console.log('user', user);

        // Handles creating a new company
        const editInfo = document.getElementById('edit-info');
        console.log('middle', editInfo);

        updateCompanySidebar(editInfo, user);

        // Handles if the user wants to edit their profile
        const editProfileButton = document.getElementById('edit-profile');
        console.log('edit', editProfileButton);
        editProfileButton.addEventListener('click', event => {
            window.location.href = 'edit-profile.html';
        });
    }).catch(err => {
        // window.api.createCompany({name, number, address, city, zipCode});
        console.log('err with creating main page or no user', err.message);
        window.location.href = 'edit-profile.html';
    })
} else {
    // will be run once on the edit-profile page
    const currentCompanyForm = document.getElementById('create-company-form');
    
    // handles phone number input, allowing only numbers and adding in formatting
    const phoneNumberInput = document.getElementById('company-phone-number');
    phoneNumberInput.addEventListener('keydown', e => {
        const keyPressed = e.key;
        const keyIsDigit = /^\d$/.test(keyPressed); // sees if the input is a digit or not
        const allowedKeys = ['Backspace']
        if ((!keyIsDigit && !allowedKeys.includes(keyPressed)) || keyPressed == ' ') {
            e.preventDefault()
        }

        // adds formatting when typing digits
        if (keyIsDigit && phoneNumberInput.value.length == 0) {
            e.preventDefault()
            phoneNumberInput.value += `(${keyPressed}`;
        }

        if (keyIsDigit && phoneNumberInput.value.length == 3) {
            e.preventDefault()
            phoneNumberInput.value += `${keyPressed}) `;
        }

        if (keyIsDigit && phoneNumberInput.value.length == 9) {
            e.preventDefault()
            phoneNumberInput.value += `-${keyPressed}`;
        }

        // removes formatting when backspace
        if (keyPressed == 'Backspace') {
            if (phoneNumberInput.value.length == 11) {
                phoneNumberInput.value = phoneNumberInput.value.slice(0, -1); // need to remember slice returns the string
            }

            if (phoneNumberInput.value.length == 7) {
                phoneNumberInput.value = phoneNumberInput.value.slice(0, -2); // need to remember slice returns the string
            }

            if (phoneNumberInput.value.length == 2) {
                phoneNumberInput.value = phoneNumberInput.value.slice(0, -1); // need to remember slice returns the string
            }
        }
    });

    window.api.getCurrentCompany().then(user => {
        // adds a cancel button to go back to the home page
        const cancelButton = document.createElement('button');
        cancelButton.id = 'cancel-edit-company';
        cancelButton.classList.add('my-2', 'ms-2', 'w-100');
        cancelButton.innerText = 'Cancel';
        cancelButton.addEventListener('click', e => {
            window.location.href = 'index.html';
        });
        const saveCancel = document.getElementById('save-cancel');
        saveCancel.appendChild(cancelButton);

        document.getElementById('title').innerText = "Update Company Profile Data";
        // populates fields
        document.getElementById('full-name').value = user.full_name;
        setUpInput(document.getElementById('company-name'), null, "Please input full name.");
        document.getElementById('company-name').value = user.name;
        setUpInput(document.getElementById('company-name'), null, "Please input company name.");
        document.getElementById('company-address').value = user.address;
        setUpInput(document.getElementById('company-address'), null, "Please input company address.")
        document.getElementById('company-city').value = user.city;
        setUpInput(document.getElementById('company-city'), null, "Please input company city.")
        document.getElementById('state-initials').value = user.state_initials;
        setUpInput(document.getElementById('state-initials'), null, "Please input company state initials.")
        document.getElementById('company-zip-code').value = user.zip_code;
        setUpInput(document.getElementById('company-zip-code'), null, "Please input company zip code.")
        document.getElementById('company-phone-number').value = user.phone_number;
        setUpInput(document.getElementById('company-phone-number'), null, "Please input company phone number.")
        document.getElementById('company-email').value = user.email;
        setUpInput(document.getElementById('company-email'), null, "Please input company email.")

        currentCompanyForm.addEventListener('submit', e => {
            e.preventDefault();
            const fullName = document.getElementById('full-name').value;
            const companyName = document.getElementById('company-name').value;
            const address = document.getElementById('company-address').value;
            const city = document.getElementById('company-city').value;
            const stateInitials = document.getElementById('state-initials').value
            const zipCode = document.getElementById('company-zip-code').value;
            const phoneNumber = document.getElementById('company-phone-number').value;
            const email = document.getElementById('company-email').value;
            if (fullName == "" || companyName == "" || address == "" || city == "" || stateInitials == "" || zipCode == "" || phoneNumber == "" || email == "") {
                console.log('no update company');
            } else {
                const response = window.api.updateCurrentCompany({fullName, companyName, address, city, stateInitials, zipCode, phoneNumber, email});
                console.log('res:', response);
                window.location.href = 'index.html';
            }
        })
    }).catch(err => {
        document.getElementById('title').innerText = "Create Company Profile Data";
        setUpInput(document.getElementById('company-name'), null, "Please input full name.");
        setUpInput(document.getElementById('company-name'), null, "Please input company name.");
        setUpInput(document.getElementById('company-address'), null, "Please input company address.")
        setUpInput(document.getElementById('company-city'), null, "Please input company city.")
        setUpInput(document.getElementById('state-initials'), null, "Please input company state initials.")
        setUpInput(document.getElementById('company-zip-code'), null, "Please input company zip code.")
        setUpInput(document.getElementById('company-phone-number'), null, "Please input company phone number.")
        setUpInput(document.getElementById('company-email'), null, "Please input company email.");
        intInput();
        currentCompanyForm.addEventListener('submit', e => {
            e.preventDefault();
            const fullName = document.getElementById('full-name').value;
            const companyName = document.getElementById('company-name').value;
            const address = document.getElementById('company-address').value;
            const city = document.getElementById('company-city').value;
            const stateInitials = document.getElementById('state-initials').value
            const zipCode = document.getElementById('company-zip-code').value;
            const phoneNumber = document.getElementById('company-phone-number').value;
            const email = document.getElementById('company-email').value;
            if (fullName == "" || companyName == "" || address == "" || city == "" || stateInitials == "" || zipCode == "" || phoneNumber == "" || email == "") {
                console.log('no create company');
            } else {
                const response = window.api.createInitialCompany({fullName, companyName, address, city, zipCode, stateInitials, phoneNumber, email});
                console.log('res:', response);
                window.location.href = 'index.html';
            }
        })
    });
}

// makes it so its only int input
function intInput() {
    const intInputs = document.querySelectorAll('.int');
    intInputs.forEach(intInput => {
        intInput.addEventListener('keydown', e => {
            const keyPressed = e.key;
            const keyIsDigit = /^\d$/.test(keyPressed); // sees if the input is a digit or not
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'];
            if ((!keyIsDigit && !allowedKeys.includes(keyPressed)) || keyPressed == ' ') {
                e.preventDefault();
            }
        });
    });

    // makes it so you can type a dash, used for zip code
    const dashInput = document.querySelector('.int-dash');
    dashInput.addEventListener('keydown', e => {
        const keyPressed = e.key;
        const keyIsDigit = /^\d$/.test(keyPressed); // sees if the input is a digit or not
        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', '-'];
        if ((!keyIsDigit && !allowedKeys.includes(keyPressed)) || keyPressed == ' ') {
            e.preventDefault();
        }
    })
}

// makes it so the user can put a period
function doubleInput() {
    const doubleInputs = document.querySelectorAll('.double');
    doubleInputs.forEach(doubleInput => {
        doubleInput.addEventListener('keydown', e => {
            const keyPressed = e.key;
            const keyIsDigit = /^\d$/.test(keyPressed); // sees if the input is a digit or not
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', '.'];
            if ((!keyIsDigit && !allowedKeys.includes(keyPressed)) || keyPressed == ' ') {
                e.preventDefault();
            }
        });
    });
}

// makes all letters uppercase for the initials
function initialsInput(fileButton = "") {
    const initialsInput = document.querySelector('.initials');
    initialsInput.addEventListener('keydown', e => {
        const keyPressed = e.key;
        const keyIsLetter = /^[a-zA-z]/g.test(keyPressed);
        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', ' '];
        if (!keyIsLetter && !allowedKeys.includes(keyPressed)) {
            e.preventDefault();
        } else {
            if (keyIsLetter && keyPressed.length == 1 && initialsInput.value.length < 4) {
                e.preventDefault();
                initialsInput.value += keyPressed.toUpperCase();
            }
        }
    });
}

// function addWarningBeforeFileCreation() {
//     const companyForm = document.getElementById('edit-company-form');
//     const warning = document.createElement('p');
//     warning.innerText = "Save or refresh before file creation."
//     warning.classList.add('warning');
//     companyForm.appendChild(warning);
// }

// function removeWarningBeforeFileCreation() {
//     const companyForm = document.getElementById('edit-company-form');
//     const warning = document.querySelector('.warning');
//     console.log('warning', warning);
//     companyForm.removeChild(warning);
// }