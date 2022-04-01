import Assert from "@web-atoms/unit-test/dist/Assert";
import Category from "@web-atoms/unit-test/dist/Category";
import Test from "@web-atoms/unit-test/dist/Test";
import TestItem from "@web-atoms/unit-test/dist/TestItem";
import { Cloner } from "../../models/Cloner";

export default class ClonerTest extends TestItem {

    @Test
    public cloneOneLevel(): void {
        const source = {
            emails: [
                {
                    emailID: 1,
                    subject: "a",
                    emailRecipients: [
                        {
                            emailRecipientID: 2,
                            email: null
                        }
                    ],
                    attachments: [
                        {
                            attachmentID: 3,
                            email: null
                        }
                    ]
                }
            ]
        };

        const e = source.emails[0];
        e.emailRecipients[0].email = e;
        e.attachments[0].email = e;

        const copy = new Cloner(source)
            .include((x) => x.emails)
                .thenInclude((x) => x.emailRecipients)
            .include((x) => x.emails)
                .thenInclude((x) => x.attachments)
            .copy;

        Assert.equals(1, copy.emails[0].emailID);
        Assert.equals("a", copy.emails[0].subject);
        Assert.equals(2, copy.emails[0].emailRecipients[0].emailRecipientID);
        Assert.equals(3, copy.emails[0].attachments[0].attachmentID);
        Assert.equals(undefined, copy.emails[0].emailRecipients[0].email);
        Assert.equals(undefined, copy.emails[0].attachments[0].email);
    }

}
