import Test from "@web-atoms/unit-test/dist/Test";
import TestItem from "@web-atoms/unit-test/dist/TestItem";
import ChangeSet from "../../models/ChangeSet";
import Assert from "@web-atoms/unit-test/dist/Assert";

export default class ChangeSetTest extends TestItem {

    @Test
    public simple() {

        const changeSet = this.createChangeSet();
        const { editable } = changeSet;

        Assert.equals(false, changeSet.modified);

        Assert.equals(void 0, changeSet.changes.accountName);

        editable.accountName = "Akash";

        Assert.equals(true, changeSet.modified);
        Assert.equals("Akash", changeSet.changes.accountName);
        Assert.equals(`{"$type":"Account","accountID":2,"accountName":"Akash"}`, JSON.stringify(changeSet.changes));
    }

    @Test
    public multiple() {

        const changeSet = this.createChangeSet();
        const { editable } = changeSet;

        editable.posts[0].title = "Title 2";

        Assert.isTrue(changeSet.modified);
        const json = `{"posts":[{"$type":"Post","postID":2,"title":"Title 2"}],"$type":"Account","accountID":2,"accountName":"Akash Kava"}`;
        Assert.equals(json, JSON.stringify(changeSet.changes));

        editable.posts.push({
            postID: 4,
            title: "Title 4"
        });

        console.log(JSON.stringify(changeSet.changes));

    }


 
    private createChangeSet() {
        const account = {
            $type: "Account",
            accountID: 2,
            accountName: "Akash Kava",
            posts: [
                {
                    $type: "Post",
                    postID: 2,
                    title: "Post 2",
                    account: null
                }
            ]
        };
        account.posts[0].account = account;
        return ChangeSet.create(account);        
    }
}