import { LightningElement, track,api} from 'lwc';
import getEmailTemplates from '@salesforce/apex/EmailTemplateController.getEmailTemplates';
import getRelatedFields from '@salesforce/apex/EmailTemplateController.getRelatedFields';
import getRecordFieldValues from '@salesforce/apex/EmailTemplateController.getRecordFieldValues';

export default class ObjectEmailTemplateDragDrop1 extends LightningElement {
    @api recordId;
    @api objectApiName;
    @track currentStep = 1;
    @track emailTemplates = [];
    @track selectedEmailTemplateId = '';
    @track selectedEmailTemplate = {};
    @track relatedFields = [];
    @track emailBodyContent = '';
    @track dupEmailBodyContent = '';

    // New properties for preview step
    @track emailFrom = 'jagadeesh.boddepalli@raagvitech.com';
    @track emailTo = 'recipient@example.com';
    @track emailCc = '';
    @track emailBcc = '';

    get isInitialStep() {
        return this.currentStep === 1;
    }
    get isTemplateSelectionStep() {
        return this.currentStep === 2;
    }
    get isEditingStep() {
        return this.currentStep === 3;
    }
    get isPreviewStep() {
        return this.currentStep === 4;
    }
    get emailTemplateOptions() {
        return this.emailTemplates.map(template => ({
            label: template.Name,
            value: template.Id
        }));
    }

    loadTemplates() {
        console.log('Email template button is clicked2');
        
        getEmailTemplates()
            .then(result => {
                this.emailTemplates = result;
                this.currentStep = 2;
            })
            .catch(error => {
                console.error('Error fetching email templates:', error);
            });
    }

    handleTemplateChange(event) {
        this.selectedEmailTemplateId = event.detail.value;
        this.selectedEmailTemplate = this.emailTemplates.find(
            template => template.Id === this.selectedEmailTemplateId
        );

        getRelatedFields({ templateId: this.selectedEmailTemplateId })
            .then(fields => {
                this.relatedFields = fields;
                this.emailBodyContent = this.selectedEmailTemplate.Body || '';
                this.currentStep = 3;
            })
            .catch(error => {
                console.error('Error fetching related fields:', error);
            });
    }
/*Developer Name : Md Sikandar
To add drop and drag functionality
on drop of merge field value should be display in preview area
*/
    handleDragStart(event) {
        event.dataTransfer.setData('text', event.target.dataset.id);
    }
    handleDragOver(event) {
        event.preventDefault();
        const dropZone = this.template.querySelector('.drop-zone');
        if (dropZone) {
            dropZone.classList.add('dragging-over'); // Default highlight (green first)
        }
    }

    handleDragLeave(event){
        const dropZone = this.template.querySelector('.drop-zone');
        if (dropZone) {
            dropZone.classList.remove('error-drop', 'success-drop');
        }
    }
    
    /*
    Developer Name : Md Sikandar
    To check whether the drop is valid or not
    if valid then append the merge field  
    */
    handleDrop(event) {
        event.preventDefault();
        const dropZone = this.template.querySelector('.drop-zone');
        const fieldApiName = event.dataTransfer.getData('text');
        const regex = new RegExp(`{{\\s*${fieldApiName}\\s*}}`, 'g');
    
        if (this.emailBodyContent.match(regex)) {
            // Duplicate drop → Apply red highlight
            dropZone.classList.add('error-drop');
            
            setTimeout(() => {
                dropZone.classList.remove('error-drop');
                this.resetDropZoneStyles(dropZone); // Reset styles after timeout
            }, 500);
            return;
        }
    
        // Append the merge field to the email body
        this.emailBodyContent += ` {{${fieldApiName}}} `;
        this.emailBodyContent = this.emailBodyContent.trim();
        this.dupEmailBodyContent = this.emailBodyContent; // Store for preview
    
        // First-time valid drop → Green highlight
        dropZone.classList.add('success-drop'); 
        setTimeout(() => {
            dropZone.classList.remove('success-drop');
            this.resetDropZoneStyles(dropZone); // Reset styles after timeout
        }, 500);   
    }

// Utility function to reset drop-zone to default styles
resetDropZoneStyles(dropZone) {
    dropZone.style.border = "2px dashed #d8dde6";  
    dropZone.style.backgroundColor = "transparent"; 
}

    handleRichTextChange(event) {
        this.emailBodyContent = event.detail.value;
    }
    /*Written BY : Md Sikandar
    Navigate to Preview page and show the value of merge field
    if user click on preview button then it will show the value of merge field
    */
   goToPreview() {
    if (this.selectedEmailTemplate.FromAddress) {
        this.emailFrom = this.selectedEmailTemplate.FromAddress;
    }
    if (!this.recordId || !this.objectApiName) {
        console.error('Record ID or Object API Name is missing');
        return;
    }
        // Extract field API names from emailBodyContent (e.g., ["Name", "Phone"])
        const regex = /{{(.*?)}}/g;
        let match;
        let fieldApiNames = [];
        while ((match = regex.exec(this.emailBodyContent)) !== null) {
            fieldApiNames.push(match[1]);
        }
    
        if (fieldApiNames.length === 0) {
            this.currentStep = 4; // No merge fields, go to preview
            return;
        }
    // Written BY : Md SIkandar
    // Call Apex to fetch field values
    // Update UI with actual values
    getRecordFieldValues({ objectApiName: this.objectApiName, recordId: this.recordId, fieldApiNames })
    .then(result => {
        let updatedContent = this.emailBodyContent;
        fieldApiNames.forEach(field => {
            if (result[field]) {
                updatedContent = updatedContent.replace(`{{${field}}}`, result[field]);
            }
        });
        this.emailBodyContent = updatedContent; 
        this.currentStep = 4;
    })
    .catch(error => {
        console.error('Error fetching field values:', error);
    });

}


    goToTemplateSelection(event) {
        this.currentStep = 2;
    }
// Md Sikandar
//on click of back button it navigate to editing window
    goToEditing() {
        console.log('back button is clicked');
        this.emailBodyContent  = '';
        this.emailBodyContent = this.dupEmailBodyContent;
        this.currentStep = 3;
    }

    handleFromChange(event) { this.emailFrom = event.target.value; }
    handleToChange(event) { this.emailTo = event.target.value; }
    handleCcChange(event) { this.emailCc = event.target.value; }
    handleBccChange(event) { this.emailBcc = event.target.value; }

    sendEmail() {
        sendEmailApex({
            fromAddress: this.emailFrom,
            toAddress: this.emailTo,
            ccAddress: this.emailCc,
            bccAddress: this.emailBcc,
            subject: this.selectedEmailTemplate.Subject,
            body: this.emailBodyContent
        })
        .then(() => {
            alert('Email Sent Successfully!');
        })
        .catch(error => {
            console.error('Error sending email:', error);
        });
    }
}