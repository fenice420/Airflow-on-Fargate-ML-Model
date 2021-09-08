import { Construct } from "@aws-cdk/core";
import {AwsLogDriver, } from "@aws-cdk/aws-ecs";
import { RetentionDays } from "@aws-cdk/aws-logs";
import {IVpc, ISecurityGroup, Port} from "@aws-cdk/aws-ec2";
import efs = require('@aws-cdk/aws-efs');
import { LogGroup } from '@aws-cdk/aws-logs';

import { AirflowDagTaskDefinition, EfsVolumeInfo } from "./task-construct"

export interface DagTasksProps {
  readonly vpc: IVpc;
  readonly defaultVpcSecurityGroup: ISecurityGroup;
}

export class DagTasks extends Construct {

  constructor(
    scope: Construct,
    taskName: string,
    props: DagTasksProps
  ) {
    super(scope, taskName + "-TaskConstruct");

    const logging = new AwsLogDriver({ 
      streamPrefix: 'FarFlowDagTaskLogging',
      logGroup: new LogGroup(scope, "FarFlowDagTaskLogs", {
        logGroupName: "FarFlowDagTaskLogs",
        retention: RetentionDays.ONE_MONTH
      })
    });

    let sharedFS = new efs.FileSystem(this, 'EFSVolume', {
      vpc: props.vpc,
      securityGroup: props.defaultVpcSecurityGroup
    });
    sharedFS.connections.allowInternally(Port.tcp(2049));

    let efsVolumeInfo: EfsVolumeInfo = {
      containerPath: "/shared-volume",
      volumeName: "SharedVolume",
      efsFileSystemId: sharedFS.fileSystemId
    }

    // Task Container with multiple python executables
    new AirflowDagTaskDefinition(this, 'FarFlowMLTask', {
      containerInfo: {
        assetDir: "./tasks/ml_task",
        name: "MLTaskContainer"
      },
      cpu: 512,
      memoryLimitMiB: 1024,
      taskFamilyName: "FarFlowMLTask",
      logging: logging,
      efsVolumeInfo: efsVolumeInfo
    });
  }
}
