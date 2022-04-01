import Assert from "@web-atoms/unit-test/dist/Assert";
import Test from "@web-atoms/unit-test/dist/Test";
import TestItem from "@web-atoms/unit-test/dist/TestItem";
import { Cloner } from "../../models/Cloner";
import mergeProperties from "../../services/mergeProperties";

export default class MergeTests extends TestItem {

    @Test
    public copyAndMerge() {
        const source = {
            emails: [
                {
                    emailID: 0,
                    subject: "a",
                    emailRecipients: [
                        {
                            emailRecipientID: 0,
                            email: null
                        }
                    ],
                    attachments: [
                        {
                            attachmentID: 0,
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

        const mergeTarget = {
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

        mergeProperties(mergeTarget, copy);

        Assert.equals(1, source.emails[0].emailID);
        Assert.equals(2, source.emails[0].emailRecipients[0].emailRecipientID);
        Assert.equals(3, source.emails[0].attachments[0].attachmentID);
    }

}
