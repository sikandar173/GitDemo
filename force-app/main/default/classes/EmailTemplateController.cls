public with sharing class EmailTemplateController {

    @AuraEnabled(cacheable=true)
    public static List<EmailTemplate> getEmailTemplates() {
        return [SELECT Id, Name, Subject, Body, RelatedEntityType FROM EmailTemplate];
    }

    @AuraEnabled(cacheable=true)
    public static List<FieldWrapper> getRelatedFields(Id templateId) {
        EmailTemplate template = [SELECT RelatedEntityType FROM EmailTemplate WHERE Id = :templateId LIMIT 1];




        
        if (template.RelatedEntityType == null) {
            return new List<FieldWrapper>();
        }

        String objectName = template.RelatedEntityType;

        if (!Schema.getGlobalDescribe().containsKey(objectName)) {
            return new List<FieldWrapper>();
        }

        Map<String, Schema.SObjectField> fieldsMap = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap();
        List<FieldWrapper> fieldList = new List<FieldWrapper>();

        for (String fieldName : fieldsMap.keySet()) {
            Schema.DescribeFieldResult fieldDescribe = fieldsMap.get(fieldName).getDescribe();
            fieldList.add(new FieldWrapper(fieldName, fieldDescribe.getLabel()));
        }
        
        return fieldList;
    }

    public class FieldWrapper {
        @AuraEnabled public String fieldApiName;
        @AuraEnabled public String label;

        public FieldWrapper(String fieldApiName, String label) {
            this.fieldApiName = fieldApiName;
            this.label = label;
        }
    }

    @AuraEnabled
public static void sendEmailToRecipient(String toEmail, String ccEmail, String bccEmail, String subject, String body) {
    Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
    mail.setToAddresses(new List<String>{toEmail});
    if (!String.isEmpty(ccEmail)) mail.setCcAddresses(new List<String>{ccEmail});
    if (!String.isEmpty(bccEmail)) mail.setBccAddresses(new List<String>{bccEmail});
    mail.setSubject(subject);
    mail.setHtmlBody(body);
    Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });
}


@AuraEnabled
public static void sendEmail(String fromAddress, String toAddress, String ccAddress, String bccAddress, String subject, String body) {
    try {
        // Create an email message
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        
        // Set Sender Address (Must be an Org-Wide Address or Valid Salesforce Address)
        if (String.isNotBlank(fromAddress)) {
            mail.setReplyTo(fromAddress);
            mail.setOrgWideEmailAddressId(getOrgWideEmailId(fromAddress));
        }

        // Set To, CC, BCC
        if (String.isNotBlank(toAddress)) {
            mail.setToAddresses(new List<String>{ toAddress });
        }
        if (String.isNotBlank(ccAddress)) {
            mail.setCcAddresses(new List<String>{ ccAddress });
        }
        if (String.isNotBlank(bccAddress)) {
            mail.setBccAddresses(new List<String>{ bccAddress });
        }

        // Set Subject & Body
        mail.setSubject(subject);
        mail.setHtmlBody(body);

        // Send Email
        Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });

    } catch (Exception e) {
        throw new AuraHandledException('Error sending email: ' + e.getMessage());
    }
}

private static Id getOrgWideEmailId(String email) {
    OrgWideEmailAddress[] orgWideEmails = [SELECT Id, Address FROM OrgWideEmailAddress WHERE Address = :email LIMIT 1];
    return (orgWideEmails.size() > 0) ? orgWideEmails[0].Id : null;
}
/*Written BY: Md Sikandar
 To fetch the real value of selected field api name in drop down
 So that in preview page we can show the real values of field */
@AuraEnabled
public static Map<String, String> getRecordFieldValues(String objectApiName, Id recordId, List<String> fieldApiNames) {
    if (String.isEmpty(objectApiName) || String.isEmpty(recordId) || fieldApiNames.isEmpty()) {
        return new Map<String, String>();
    }

    String query = 'SELECT ' + String.join(fieldApiNames, ', ') + ' FROM ' + objectApiName + ' WHERE Id = :recordId';
    SObject record = Database.query(query);

    Map<String, String> fieldValues = new Map<String, String>();
    for (String field : fieldApiNames) {
        fieldValues.put(field, String.valueOf(record.get(field)));
    }

    return fieldValues;
}
}